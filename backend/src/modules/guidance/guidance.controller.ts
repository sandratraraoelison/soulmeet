import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateGuidanceConversationDto, GuidanceArchiveQueryDto, GuidancePageQueryDto, SendGuidanceMessageDto, UpdateGuidanceConversationDto, UpdateGuidanceMessageDto, UpsertMemoryDto } from './dto/guidance.dto';
import { GuidanceService } from './guidance.service';
import { writeSseError, writeSseEvent } from './sse.util';

@ApiTags('guidance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('guidance')
export class GuidanceController {
  constructor(private readonly guidance: GuidanceService) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Create a Guidance conversation' })
  createConversation(@CurrentUser() user: JwtPayload, @Body() dto: CreateGuidanceConversationDto) {
    return this.guidance.createConversation(user.sub, dto.title);
  }

  @Get('suggestion')
  @ApiOperation({ summary: 'Get a conversation starter based on recent coach conversations' })
  suggestion(@CurrentUser() user: JwtPayload) {
    return this.guidance.getHomeSuggestion(user.sub);
  }

  @Get('conversations')
  listConversations(@CurrentUser() user: JwtPayload, @Query() query: GuidancePageQueryDto) {
    return this.guidance.listConversations(user.sub, query.cursor, query.limit, query.status);
  }

  @Get('archive')
  @ApiOperation({ summary: 'Read-only unified and searchable Coach archive' })
  archive(@CurrentUser() user: JwtPayload, @Query() query: GuidanceArchiveQueryDto) {
    return this.guidance.archive(user.sub, query.query, query.cursor, query.limit);
  }

  @Get('conversations/:conversationId')
  getConversation(@CurrentUser() user: JwtPayload, @Param('conversationId') id: string) {
    return this.guidance.getConversation(user.sub, id);
  }

  @Patch('conversations/:conversationId')
  updateConversation(@CurrentUser() user: JwtPayload, @Param('conversationId') id: string, @Body() dto: UpdateGuidanceConversationDto) {
    return this.guidance.updateConversation(user.sub, id, dto.title);
  }

  @Post('conversations/:conversationId/archive')
  archiveConversation(@CurrentUser() user: JwtPayload, @Param('conversationId') id: string) {
    return this.guidance.archiveConversation(user.sub, id);
  }

  @Delete('conversations/:conversationId')
  deleteConversation(@CurrentUser() user: JwtPayload, @Param('conversationId') id: string) {
    return this.guidance.deleteConversation(user.sub, id);
  }

  @Get('conversations/:conversationId/messages')
  history(@CurrentUser() user: JwtPayload, @Param('conversationId') id: string, @Query() query: GuidancePageQueryDto) {
    return this.guidance.history(user.sub, id, query.cursor, query.limit);
  }

  @Post('conversations/:conversationId/messages')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Send a message and receive a complete coach response' })
  send(@CurrentUser() user: JwtPayload, @Param('conversationId') id: string, @Body() dto: SendGuidanceMessageDto) {
    return this.guidance.send(user.sub, id, dto.content);
  }

  @Post('conversations/:conversationId/messages/stream')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiProduces('text/event-stream')
  @ApiOperation({ summary: 'Send a message and stream the coach response with SSE' })
  async stream(
    @CurrentUser() user: JwtPayload,
    @Param('conversationId') id: string,
    @Body() dto: SendGuidanceMessageDto,
    @Res() response: Response,
  ): Promise<void> {
    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.flushHeaders();
    try {
      for await (const item of this.guidance.stream(user.sub, id, dto.content)) {
        writeSseEvent(response, item);
      }
    } catch (error) {
      writeSseError(response, error);
    } finally {
      response.end();
    }
  }

  @Patch('messages/:messageId')
  updateMessage(@CurrentUser() user: JwtPayload, @Param('messageId') id: string, @Body() dto: UpdateGuidanceMessageDto) {
    return this.guidance.updateMessage(user.sub, id, dto.content);
  }

  @Delete('messages/:messageId')
  deleteMessage(@CurrentUser() user: JwtPayload, @Param('messageId') id: string) {
    return this.guidance.deleteMessage(user.sub, id);
  }

  @Post('messages/:messageId/regenerate')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  regenerate(@CurrentUser() user: JwtPayload, @Param('messageId') id: string) {
    return this.guidance.regenerate(user.sub, id);
  }

  @Get('memories')
  listMemories(@CurrentUser() user: JwtPayload) { return this.guidance.listMemories(user.sub); }

  @Post('memories')
  createMemory(@CurrentUser() user: JwtPayload, @Body() dto: UpsertMemoryDto) {
    return this.guidance.createMemory(user.sub, dto.content, dto.category);
  }

  @Patch('memories/:memoryId')
  updateMemory(@CurrentUser() user: JwtPayload, @Param('memoryId') id: string, @Body() dto: UpsertMemoryDto) {
    return this.guidance.updateMemory(user.sub, id, dto.content, dto.category);
  }

  @Delete('memories/:memoryId')
  deleteMemory(@CurrentUser() user: JwtPayload, @Param('memoryId') id: string) {
    return this.guidance.deleteMemory(user.sub, id);
  }

}
