import { HttpStatus, Inject, Injectable, Optional } from '@nestjs/common';
import { GuidanceConversationStatus, GuidanceMessageRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { GuidanceException } from './guidance.exception';
import { GuidancePromptService } from './guidance-prompt.service';
import { LLM_PROVIDER, LlmProvider } from './llm/llm.types';
import { SoulprintContextService } from '../soulprint/services/soulprint-context.service';
import { SoulprintExtractionQueueService } from '../soulprint/services/soulprint-extraction-queue.service';

@Injectable()
export class GuidanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prompts: GuidancePromptService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
    @Optional() private readonly soulprintContext?: SoulprintContextService,
    @Optional() private readonly soulprintExtractionQueue?: SoulprintExtractionQueueService,
  ) {}

  async createConversation(userId: string, title?: string) {
    const [coach, profile] = await Promise.all([
      this.prisma.coach.findUnique({ where: { userId } }),
      this.prisma.profile.findUnique({ where: { userId } }),
    ]);
    return this.prisma.$transaction(async (tx) => {
      const conversation = await tx.guidanceConversation.create({ data: { userId, title } });
      if (coach) {
        const firstName = profile?.firstName?.trim();
        const greeting = firstName
          ? `Hi ${firstName}, I’m glad you’re here. We can take this at your pace—what feels most important to talk about today?`
          : 'I’m glad you’re here. We can take this at your pace—what feels most important to talk about today?';
        await tx.guidanceMessage.create({
          data: { conversationId: conversation.id, role: GuidanceMessageRole.ASSISTANT, content: greeting },
        });
      }
      return conversation;
    });
  }

  async createDailyCoachMessage(userId: string, checkInId: string, dayKey: string) {
    let conversation = await this.prisma.guidanceConversation.findFirst({
      where: { userId, status: GuidanceConversationStatus.ACTIVE },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
    });
    if (!conversation) {
      conversation = await this.prisma.guidanceConversation.create({
        data: { userId, title: 'Daily check-in' },
      });
    }
    const messages = await this.contextMessages(userId, conversation.id);
    messages.push({
      role: 'system',
      content: [
        `Initiate the coach's daily check-in for ${dayKey}. The user has not sent a message today; you are speaking first.`,
        'Choose one timely, useful focus from personality, emotional patterns, dating history, relationship goals, communication style, attachment tendencies, or partner preferences.',
        'Use known context to avoid repetition and favor an important area that is still unclear. Vary the focus from recent coach messages.',
        'Write 2–4 natural sentences in the configured coach voice. Be warm and specific, offer a brief reflection or reason for checking in, and end with exactly one easy-to-answer question.',
        'Do not mention scheduling, automation, profile completion, data collection, internal categories, or that this is a generated notification. Do not sound like a survey.',
      ].join('\n'),
    });
    const response = await this.llm.complete(messages, { priority: 'background' });
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.guidanceMessage.create({
        data: {
          conversationId: conversation.id,
          role: GuidanceMessageRole.ASSISTANT,
          content: response.content.trim(),
          provider: response.provider,
          model: response.model,
        },
      });
      await tx.guidanceConversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });
      await tx.coachDailyCheckIn.update({
        where: { id: checkInId },
        data: { status: 'SENT', messageId: message.id, sentAt: new Date(), lockedAt: null, lastError: null },
      });
      return { conversation, message };
    });
  }

  async listConversations(userId: string, cursor?: string, limit = 20, status: GuidanceConversationStatus = GuidanceConversationStatus.ACTIVE) {
    const rows = await this.prisma.guidanceConversation.findMany({
      where: { userId, status }, orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }], take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { messages: { where: { isDeleted: false }, orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    const page = rows.slice(0, limit);
    return { conversations: page, nextCursor: rows.length > limit ? page.at(-1)?.id ?? null : null };
  }

  getConversation(userId: string, id: string) { return this.ownedConversation(userId, id); }
  async updateConversation(userId: string, id: string, title: string) {
    await this.ownedConversation(userId, id);
    return this.prisma.guidanceConversation.update({ where: { id }, data: { title } });
  }
  async archiveConversation(userId: string, id: string) {
    await this.ownedConversation(userId, id);
    return this.prisma.guidanceConversation.update({ where: { id }, data: { status: GuidanceConversationStatus.ARCHIVED } });
  }
  async deleteConversation(userId: string, id: string) {
    await this.ownedConversation(userId, id);
    await this.prisma.guidanceConversation.delete({ where: { id } });
  }

  async history(userId: string, conversationId: string, cursor?: string, limit = 20) {
    await this.ownedConversation(userId, conversationId);
    const rows = await this.prisma.guidanceMessage.findMany({
      where: { conversationId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const page = rows.slice(0, limit).map(this.sanitize);
    return { messages: page, nextCursor: rows.length > limit ? page.at(-1)?.id ?? null : null };
  }

  async send(userId: string, conversationId: string, content: string) {
    await this.ownedConversation(userId, conversationId);
    await this.persistUserMessage(conversationId, content);
    const response = await this.llm.complete(await this.contextMessages(userId, conversationId), { priority: 'interactive' });
    const message = await this.persistAssistant(conversationId, response.content, response.provider, response.model);
    void this.soulprintExtractionQueue?.enqueue(userId, conversationId);
    return { message };
  }

  async *stream(userId: string, conversationId: string, content: string) {
    await this.ownedConversation(userId, conversationId);
    const userMessage = await this.persistUserMessage(conversationId, content);
    yield { event: 'message', data: userMessage };
    let answer = '';
    for await (const token of this.llm.stream(await this.contextMessages(userId, conversationId), { priority: 'interactive' })) {
      answer += token;
      yield { event: 'token', data: token };
    }
    if (!answer.trim()) throw new GuidanceException('LLM_INVALID_RESPONSE', 'The AI provider returned an empty response', HttpStatus.BAD_GATEWAY);
    const assistant = await this.persistAssistant(conversationId, answer.trim(), this.llm.name, this.llm.model);
    void this.soulprintExtractionQueue?.enqueue(userId, conversationId);
    yield { event: 'complete', data: assistant };
  }

  async updateMessage(userId: string, messageId: string, content: string) {
    const message = await this.ownedMessage(userId, messageId);
    if (message.role !== GuidanceMessageRole.USER) throw new GuidanceException('MESSAGE_NOT_EDITABLE', 'Only user messages can be edited', HttpStatus.FORBIDDEN);
    if (message.isDeleted) throw new GuidanceException('MESSAGE_DELETED', 'Deleted messages cannot be edited');
    return this.prisma.guidanceMessage.update({ where: { id: messageId }, data: { content, isEdited: true, editedAt: new Date() } });
  }

  async deleteMessage(userId: string, messageId: string) {
    await this.ownedMessage(userId, messageId);
    return this.prisma.guidanceMessage.update({ where: { id: messageId }, data: { content: null, isDeleted: true, deletedAt: new Date() } }).then(this.sanitize);
  }

  async regenerate(userId: string, messageId: string) {
    const message = await this.ownedMessage(userId, messageId);
    if (message.role !== GuidanceMessageRole.ASSISTANT) throw new GuidanceException('MESSAGE_NOT_REGENERATABLE', 'Only coach responses can be regenerated');
    await this.prisma.guidanceMessage.update({ where: { id: message.id }, data: { content: null, isDeleted: true, deletedAt: new Date() } });
    const response = await this.llm.complete(await this.contextMessages(userId, message.conversationId), { priority: 'interactive', cache: false });
    return this.persistAssistant(message.conversationId, response.content, response.provider, response.model);
  }

  listMemories(userId: string) { return this.prisma.userMemory.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } }); }
  createMemory(userId: string, content: string, category?: string) { return this.prisma.userMemory.create({ data: { userId, content, category } }); }
  async updateMemory(userId: string, id: string, content: string, category?: string) {
    await this.ownedMemory(userId, id);
    return this.prisma.userMemory.update({ where: { id }, data: { content, category } });
  }
  async deleteMemory(userId: string, id: string) { await this.ownedMemory(userId, id); return this.prisma.userMemory.delete({ where: { id } }); }
  private async contextMessages(userId: string, conversationId: string) {
    const [coach, profile, soulprint, memories, history] = await Promise.all([
      this.prisma.coach.findUnique({ where: { userId } }), this.prisma.profile.findUnique({ where: { userId } }),
      this.soulprintContext?.forGuidance(userId) ?? Promise.resolve({ confirmedFacts: [], declaredFacts: [], tentativeInsights: [] }),
      this.prisma.userMemory.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 20 }),
      this.prisma.guidanceMessage.findMany({ where: { conversationId }, orderBy: { createdAt: 'asc' }, take: 40 }),
    ]);
    if (!coach) throw new GuidanceException('COACH_REQUIRED', 'Create your coach before using Guidance', HttpStatus.CONFLICT);
    return this.prompts.messages(this.prompts.buildSystemPrompt({ coach, profile, soulprint, memories }), history);
  }

  private persistUserMessage(conversationId: string, content: string) {
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.guidanceMessage.create({ data: { conversationId, role: GuidanceMessageRole.USER, content } });
      await tx.guidanceConversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });
      return message;
    });
  }
  private persistAssistant(conversationId: string, content: string, provider: string, model: string) {
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.guidanceMessage.create({ data: { conversationId, role: GuidanceMessageRole.ASSISTANT, content, provider, model } });
      await tx.guidanceConversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });
      return message;
    });
  }
  private async ownedConversation(userId: string, id: string) {
    const conversation = await this.prisma.guidanceConversation.findFirst({ where: { id, userId } });
    if (!conversation) throw new GuidanceException('CONVERSATION_NOT_FOUND', 'Guidance conversation not found', HttpStatus.NOT_FOUND);
    return conversation;
  }
  private async ownedMessage(userId: string, id: string) {
    const message = await this.prisma.guidanceMessage.findFirst({ where: { id, conversation: { userId } } });
    if (!message) throw new GuidanceException('MESSAGE_NOT_FOUND', 'Guidance message not found', HttpStatus.NOT_FOUND);
    return message;
  }
  private async ownedMemory(userId: string, id: string) {
    const memory = await this.prisma.userMemory.findFirst({ where: { id, userId } });
    if (!memory) throw new GuidanceException('MEMORY_NOT_FOUND', 'Memory not found', HttpStatus.NOT_FOUND);
    return memory;
  }
  private sanitize<T extends { content: string | null; isDeleted: boolean }>(message: T) { return { ...message, content: message.isDeleted ? null : message.content }; }
}
