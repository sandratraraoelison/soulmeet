import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ChatService } from './chat.service';
import {
  CreatePrivateConversationDto,
  GetMessagesQueryDto,
} from './dto/chat.dto';

@ApiTags('conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly chat: ChatService) {}

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

  @Get(':conversationId')
  @ApiOperation({ summary: 'Get a conversation for a participant' })
  get(
    @CurrentUser() user: JwtPayload,
    @Param('conversationId') conversationId: string,
  ) {
    return this.chat.getConversation(conversationId, user.sub);
  }
}
