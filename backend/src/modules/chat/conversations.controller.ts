import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ChatService } from './chat.service';
import {
  CreatePrivateConversationDto,
  GetMessagesQueryDto,
  SendAttachmentDto,
  SendMessageBodyDto,
} from './dto/chat.dto';
import { ChatMediaService } from './chat-media.service';
import { ChatRealtimeService } from './chat-realtime.service';
import { CHAT_EVENTS } from './constants/chat-events.constants';
import { PushNotificationsService } from '../notifications/push-notifications.service';

@ApiTags('conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly chat: ChatService,
    private readonly media: ChatMediaService,
    private readonly realtime: ChatRealtimeService,
    private readonly notifications: PushNotificationsService,
  ) {}

  @Post('private')
  @ApiOperation({ summary: 'Create or retrieve a private conversation' })
  createPrivate(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePrivateConversationDto,
  ) {
    return this.chat.startPrivate(user.sub, dto.participantId);
  }

  @Get()
  @ApiOperation({ summary: 'List the current user conversations' })
  list(@CurrentUser() user: JwtPayload) {
    return this.chat.list(user.sub);
  }

  @Get(':conversationId/messages')
  @ApiOperation({ summary: 'Get cursor-paginated message history' })
  messages(
    @CurrentUser() user: JwtPayload,
    @Param('conversationId') conversationId: string,
    @Query() query: GetMessagesQueryDto,
  ) {
    return this.chat.history(
      conversationId,
      user.sub,
      query.cursor,
      query.limit,
    );
  }

  @Post(':conversationId/messages')
  @ApiOperation({ summary: 'Send a text message over HTTP (web-compatible)' })
  async sendMessage(
    @CurrentUser() user: JwtPayload,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageBodyDto,
  ) {
    const result = await this.chat.send(user.sub, conversationId, dto.content, dto.clientMessageId);
    const recipientId = (await this.chat.participantIds(conversationId)).find((id) => id !== user.sub);
    if (recipientId) {
      this.realtime.emitToConversationAndUser(conversationId, recipientId, CHAT_EVENTS.CREATED, { message: result.message });
      if (!result.duplicate) {
        const senderName = await this.chat.displayName(user.sub);
        void this.notifications.send(recipientId, 'newMessages', {
          title: `New message from ${senderName}`,
          body: dto.content.slice(0, 140),
          data: { conversationId },
        });
      }
    } else this.realtime.emit(conversationId, CHAT_EVENTS.CREATED, { message: result.message });
    return { message: result.message };
  }

  @Post(':conversationId/attachments')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024, files: 1 } }))
  @ApiOperation({ summary: 'Upload and send an image or audio attachment' })
  async attachment(
    @CurrentUser() user: JwtPayload,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendAttachmentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Attachment file is required');
    await this.chat.assertParticipant(conversationId, user.sub);
    const uploaded = await this.media.upload(user.sub, dto.type, file);
    const message = await this.chat.sendAttachment(user.sub, conversationId, dto.clientMessageId, dto.type, uploaded, dto.durationMs);
    const recipientId = (await this.chat.participantIds(conversationId)).find((id) => id !== user.sub);
    if (recipientId) {
      this.realtime.emitToConversationAndUser(conversationId, recipientId, CHAT_EVENTS.CREATED, { message });
      const senderName = await this.chat.displayName(user.sub);
      void this.notifications.send(recipientId, 'newMessages', {
        title: `New message from ${senderName}`,
        body: dto.type === 'IMAGE' ? 'Sent you a photo' : 'Sent you a voice message',
        data: { conversationId },
      });
    } else this.realtime.emit(conversationId, CHAT_EVENTS.CREATED, { message });
    return message;
  }

  @Get(':conversationId')
  @ApiOperation({ summary: 'Get a conversation for a participant' })
  get(
    @CurrentUser() user: JwtPayload,
    @Param('conversationId') conversationId: string,
  ) {
    return this.chat.getConversation(conversationId, user.sub);
  }
}
