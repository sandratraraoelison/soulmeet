import { HttpStatus, Injectable } from '@nestjs/common';
import { MessageStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CHAT_CONFIG } from './constants/chat-config.constants';
import { CHAT_EVENTS } from './constants/chat-events.constants';
import { ChatException } from './chat.exception';
import { ChatRealtimeService } from './chat-realtime.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: ChatRealtimeService,
  ) {}

  private pairKey(a: string, b: string) {
    return [a, b].sort().join(':');
  }

  async assertParticipant(conversationId: string, userId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant)
      throw new ChatException(
        'FORBIDDEN_CONVERSATION',
        'You are not a participant in this conversation',
        HttpStatus.FORBIDDEN,
      );
    return participant;
  }

  async participantIds(conversationId: string) {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    return participants.map(({ userId }) => userId);
  }

  private async assertNotBlocked(userId: string, otherUserId: string) {
    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: otherUserId },
          { blockerId: otherUserId, blockedId: userId },
        ],
      },
    });
    if (block)
      throw new ChatException(
        'USER_BLOCKED',
        'Communication is blocked',
        HttpStatus.FORBIDDEN,
      );
  }

  private async otherParticipant(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);
    const other = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: { not: userId } },
    });
    if (!other)
      throw new ChatException(
        'CONVERSATION_NOT_FOUND',
        'Conversation not found',
        HttpStatus.NOT_FOUND,
      );
    await this.assertNotBlocked(userId, other.userId);
    return other;
  }

  async startPrivate(userId: string, participantId: string) {
    if (userId === participantId)
      throw new ChatException(
        'VALIDATION_ERROR',
        'You cannot chat with yourself',
      );
    const user = await this.prisma.user.findFirst({
      where: { id: participantId, isActive: true },
    });
    if (!user)
      throw new ChatException(
        'USER_NOT_FOUND',
        'User not found',
        HttpStatus.NOT_FOUND,
      );
    await this.assertNotBlocked(userId, participantId);
    const pairKey = this.pairKey(userId, participantId);
    const existing = await this.prisma.conversation.findUnique({
      where: { pairKey },
      include: { participants: true },
    });
    if (existing) return existing;
    try {
      return await this.prisma.conversation.create({
        data: {
          pairKey,
          participants: { create: [{ userId }, { userId: participantId }] },
        },
        include: { participants: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        return this.prisma.conversation.findUniqueOrThrow({
          where: { pairKey },
          include: { participants: true },
        });
      throw error;
    }
  }

  async list(userId: string) {
    const rows = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      orderBy: { conversation: { lastMessageAt: 'desc' } },
      include: {
        conversation: {
          include: {
            participants: {
              where: { userId: { not: userId } },
              include: { user: { include: { profile: true } } },
            },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    });
    return Promise.all(
      rows.map(async ({ conversation, lastReadAt }) => ({
        ...conversation,
        messages: conversation.messages.map(this.sanitizeMessage),
        unreadCount: await this.prisma.message.count({
          where: {
            conversationId: conversation.id,
            senderId: { not: userId },
            createdAt: lastReadAt ? { gt: lastReadAt } : undefined,
          },
        }),
      })),
    );
  }

  async getConversation(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);
    return this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      include: {
        participants: { include: { user: { include: { profile: true } } } },
      },
    });
  }

  async history(
    conversationId: string,
    userId: string,
    cursor?: string,
    limit = 20,
  ) {
    await this.assertParticipant(conversationId, userId);
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = messages.length > limit;
    const page = messages.slice(0, limit).map(this.sanitizeMessage);
    return {
      messages: page,
      nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    };
  }

  async send(
    userId: string,
    conversationId: string,
    content: string,
    clientMessageId: string,
  ) {
    await this.otherParticipant(conversationId, userId);
    const duplicate = await this.prisma.message.findUnique({
      where: {
        senderId_clientMessageId: { senderId: userId, clientMessageId },
      },
    });
    if (duplicate)
      return { message: this.sanitizeMessage(duplicate), duplicate: true };
    const now = new Date();
    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId,
          senderId: userId,
          clientMessageId,
          content: content.trim(),
        },
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: now },
      });
      return created;
    });
    return { message: this.sanitizeMessage(message), duplicate: false };
  }

  async update(userId: string, messageId: string, content: string) {
    const message = await this.getOwnedMessage(userId, messageId);
    if (message.isDeleted)
      throw new ChatException(
        'MESSAGE_ALREADY_DELETED',
        'Deleted messages cannot be edited',
      );
    if (Date.now() - message.createdAt.getTime() > CHAT_CONFIG.editWindowMs)
      throw new ChatException(
        'EDIT_WINDOW_EXPIRED',
        'The edit window has expired',
        HttpStatus.FORBIDDEN,
      );
    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { content: content.trim(), isEdited: true, editedAt: new Date() },
    });
    const safe = this.sanitizeMessage(updated);
    this.realtime.emit(message.conversationId, CHAT_EVENTS.UPDATED, {
      message: safe,
    });
    return safe;
  }

  async delete(userId: string, messageId: string) {
    const message = await this.getOwnedMessage(userId, messageId);
    if (message.isDeleted)
      throw new ChatException(
        'MESSAGE_ALREADY_DELETED',
        'Message is already deleted',
      );
    if (Date.now() - message.createdAt.getTime() > CHAT_CONFIG.deleteWindowMs)
      throw new ChatException(
        'DELETE_WINDOW_EXPIRED',
        'The delete window has expired',
        HttpStatus.FORBIDDEN,
      );
    const deletedAt = new Date();
    await this.prisma.message.update({
      where: { id: messageId },
      data: { content: null, isDeleted: true, deletedAt },
    });
    const payload = {
      messageId,
      conversationId: message.conversationId,
      isDeleted: true,
      deletedAt,
    };
    this.realtime.emit(message.conversationId, CHAT_EVENTS.DELETED, payload);
    return payload;
  }

  private async getOwnedMessage(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message)
      throw new ChatException(
        'MESSAGE_NOT_FOUND',
        'Message not found',
        HttpStatus.NOT_FOUND,
      );
    if (message.senderId !== userId)
      throw new ChatException(
        'MESSAGE_NOT_OWNED',
        'You do not own this message',
        HttpStatus.FORBIDDEN,
      );
    return message;
  }

  async read(userId: string, conversationId: string, messageIds: string[]) {
    await this.assertParticipant(conversationId, userId);
    const now = new Date();
    const result = await this.prisma.$transaction([
      this.prisma.message.updateMany({
        where: {
          id: { in: messageIds },
          conversationId,
          senderId: { not: userId },
        },
        data: { status: MessageStatus.READ },
      }),
      this.prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { lastReadAt: now },
      }),
    ]);
    return {
      conversationId,
      messageIds,
      readBy: userId,
      readAt: now,
      count: result[0].count,
    };
  }

  async markDelivered(messageId: string) {
    return this.prisma.message.update({
      where: { id: messageId },
      data: { status: MessageStatus.DELIVERED },
    });
  }

  private sanitizeMessage<
    T extends { content: string | null; isDeleted: boolean },
  >(message: T) {
    return { ...message, content: message.isDeleted ? null : message.content };
  }
}
