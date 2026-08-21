import { HttpStatus, Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GuidanceConversationStatus, GuidanceMessageRole, type UserMemory } from '@prisma/client';
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
    private readonly config: ConfigService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
    @Optional() private readonly soulprintContext?: SoulprintContextService,
    @Optional() private readonly soulprintExtractionQueue?: SoulprintExtractionQueueService,
  ) {}

  async createConversation(userId: string, title?: string) {
    const existing = await this.prisma.guidanceConversation.findFirst({
      where: { userId, status: GuidanceConversationStatus.ACTIVE },
      orderBy: [{ lastMessageAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    });
    if (existing) return existing;
    const [coach, profile] = await Promise.all([
      this.prisma.coach.findUnique({ where: { userId } }),
      this.prisma.profile.findUnique({ where: { userId } }),
    ]);
    const firstName = profile?.firstName?.trim();
    const greeting = coach ? await this.buildHomeSuggestion(userId, firstName) : null;
    return this.prisma.$transaction(async (tx) => {
      const conversation = await tx.guidanceConversation.create({ data: { userId, title } });
      if (coach && greeting) {
        await tx.guidanceMessage.create({
          data: { conversationId: conversation.id, role: GuidanceMessageRole.ASSISTANT, content: greeting },
        });
      }
      return conversation;
    });
  }

  async getHomeSuggestion(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    return { message: await this.buildHomeSuggestion(userId, profile?.firstName?.trim()) };
  }

  private async buildHomeSuggestion(userId: string, firstName?: string) {
    const recent = await this.prisma.guidanceMessage.findMany({
      where: {
        role: GuidanceMessageRole.USER,
        isDeleted: false,
        conversation: { userId },
        content: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { content: true },
    }) ?? [];
    const topic = recent
      .map((item) => item.content?.replace(/\s+/g, ' ').trim())
      .find((content): content is string => Boolean(content && content.length >= 12));
    const hello = firstName ? `Hey ${firstName}` : 'Hey';
    if (!topic)
      return `${hello}, how are you doing today? Tell me one interesting thing about you or your dating life.`;
    const excerpt = topic.length > 120 ? `${topic.slice(0, 117).trim()}...` : topic;
    return `${hello}, how are you doing today? Last time you told me, "${excerpt}" How are things going with that?`;
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
    const hasPreviousConversation = Boolean(await this.prisma.guidanceMessage.findFirst({
      where: { conversationId: conversation.id, role: GuidanceMessageRole.USER, isDeleted: false, content: { not: null } },
      select: { id: true },
    }));
    const messages = await this.contextMessages(userId, conversation.id);
    messages.push({
      role: 'system',
      content: [
        `Initiate the coach's daily check-in for ${dayKey}. The user has not sent a message today; you are speaking first.`,
        hasPreviousConversation
          ? "Begin with a complete but concise recap of the user's most recent conversation. Include the main situation, important feelings, patterns noticed, advice given, and any next step that was agreed."
          : 'There is no previous user conversation to recap. Start with a warm, simple check-in instead.',
        hasPreviousConversation
          ? 'Then continue with a warm, simple check-in related to that recap and end with exactly one easy-to-answer question.'
          : 'Ask one easy question about the user or their dating life.',
        'Use short sentences and everyday words. Do not copy the transcript, use headings, or sound like a report.',
        'Do not mention scheduling, automation, profile completion, data collection, internal categories, or that this is a generated notification. Do not sound like a survey.',
      ].join('\n'),
    });
    const response = await this.llm.complete(messages, { priority: 'background', feature: 'coach_check_in', userId, maxTokens: this.maxResponseTokens() });
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
      where: { userId, status },
      orderBy: [
        { lastMessageAt: { sort: 'desc', nulls: 'last' } },
        { id: 'desc' },
      ],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { messages: { where: { isDeleted: false }, orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    const page = rows.slice(0, limit);
    return { conversations: page, nextCursor: rows.length > limit ? page.at(-1)?.id ?? null : null };
  }

  async archive(userId: string, query?: string, cursor?: string, limit = 50) {
    const search = query?.trim();
    const rows = await this.prisma.guidanceMessage.findMany({
      where: {
        conversation: { userId },
        role: { in: [GuidanceMessageRole.USER, GuidanceMessageRole.ASSISTANT] },
        isDeleted: false,
        content: { not: null, ...(search ? { contains: search, mode: 'insensitive' } : {}) },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, conversationId: true, role: true, content: true, createdAt: true, updatedAt: true, isEdited: true, isDeleted: true },
    });
    const page = rows.slice(0, limit);
    return { messages: page, nextCursor: rows.length > limit ? page.at(-1)?.id ?? null : null };
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
    const latestCheckIn = await this.prisma.coachDailyCheckIn.findFirst({
      where: { userId, status: 'SENT', messageId: { not: null } },
      orderBy: { sentAt: 'desc' },
      select: { messageId: true },
    });
    const summary = latestCheckIn?.messageId
      ? await this.prisma.guidanceMessage.findUnique({ where: { id: latestCheckIn.messageId }, select: { createdAt: true } })
      : null;
    const rows = await this.prisma.guidanceMessage.findMany({
      where: { conversationId, ...(summary ? { createdAt: { gte: summary.createdAt } } : {}) }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const page = rows.slice(0, limit).map(this.sanitize);
    return { messages: page, nextCursor: rows.length > limit ? page.at(-1)?.id ?? null : null };
  }

  async send(userId: string, conversationId: string, content: string) {
    await this.ownedConversation(userId, conversationId);
    await this.persistUserMessage(conversationId, content);
    const response = await this.llm.complete(await this.contextMessages(userId, conversationId), { priority: 'interactive', feature: 'guidance', userId, maxTokens: this.maxResponseTokens() });
    const message = await this.persistAssistant(conversationId, response.content, response.provider, response.model);
    void this.soulprintExtractionQueue?.enqueue(userId, conversationId);
    return { message };
  }

  async *stream(userId: string, conversationId: string, content: string) {
    await this.ownedConversation(userId, conversationId);
    const userMessage = await this.persistUserMessage(conversationId, content);
    yield { event: 'message', data: userMessage };
    let answer = '';
    for await (const token of this.llm.stream(await this.contextMessages(userId, conversationId), { priority: 'interactive', feature: 'guidance', userId, maxTokens: this.maxResponseTokens() })) {
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
    const response = await this.llm.complete(await this.contextMessages(userId, message.conversationId), { priority: 'interactive', cache: false, feature: 'guidance', userId, maxTokens: this.maxResponseTokens() });
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
    const recentLimit = this.config.get<number>('GUIDANCE_RECENT_MESSAGES', 12);
    const memoryCandidateLimit = this.config.get<number>('GUIDANCE_MEMORY_CANDIDATE_LIMIT', 50);
    const [coach, profile, memoryCandidates, newestFirst] = await Promise.all([
      this.prisma.coach.findUnique({ where: { userId } }), this.prisma.profile.findUnique({ where: { userId } }),
      this.prisma.userMemory.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: memoryCandidateLimit }),
      this.prisma.guidanceMessage.findMany({ where: { conversationId, isDeleted: false }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: recentLimit }),
    ]);
    if (!coach) throw new GuidanceException('COACH_REQUIRED', 'Create your coach before using Guidance', HttpStatus.CONFLICT);
    const history = newestFirst.reverse();
    const query = history.filter((item) => item.role === GuidanceMessageRole.USER && item.content).slice(-3).map((item) => item.content).join(' ');
    const soulprint = await (this.soulprintContext?.forGuidance(userId, query) ?? Promise.resolve({ confirmedFacts: [], declaredFacts: [], tentativeInsights: [] }));
    const memories = this.relevantMemories(memoryCandidates, query);
    const messages = this.prompts.messages(this.prompts.buildSystemPrompt({ coach, profile, soulprint, memories }), history);
    const recalled = await this.recallEarlierConversation(userId, query);
    if (recalled.length) {
      messages.splice(1, 0, {
        role: 'system',
        content: [
          'RELEVANT EARLIER CONVERSATION EXCERPTS:',
          ...recalled.map((content) => `- ${content}`),
          'If the user asks whether you remember this topic, answer yes only when these excerpts support it. Briefly summarize the specific facts they shared in natural language. Never invent a detail. If the excerpts do not answer the question, say honestly that you do not have enough detail.',
        ].join('\n'),
      });
    }
    return messages;
  }

  private async recallEarlierConversation(userId: string, query: string): Promise<string[]> {
    const ignored = new Set([
      'about', 'again', 'avec', 'comme', 'comment', 'dans', 'does', 'est', 'have',
      'life', 'remember', 'souviens', 'that', 'this', 'told', 'what', 'when', 'your',
    ]);
    const terms = [...this.terms(query)].filter((term) => !ignored.has(term)).slice(-6);
    if (!terms.length) return [];
    const candidates = await this.prisma.guidanceMessage.findMany({
      where: {
        role: GuidanceMessageRole.USER,
        isDeleted: false,
        content: { not: null },
        conversation: { userId },
        OR: terms.map((term) => ({ content: { contains: term, mode: 'insensitive' as const } })),
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { content: true },
    });
    return candidates
      .map((item) => item.content?.replace(/\s+/g, ' ').trim())
      .filter((content): content is string => Boolean(content))
      .filter((content, index, all) => all.indexOf(content) === index)
      .slice(0, 5);
  }

  private relevantMemories(memories: UserMemory[], query: string): UserMemory[] {
    const limit = this.config.get<number>('GUIDANCE_RELEVANT_MEMORIES', 5);
    if (!limit) return [];
    const terms = this.terms(query);
    return memories.map((memory, index) => ({ memory, score: this.overlap(terms, this.terms(`${memory.category ?? ''} ${memory.content}`)) * 100 - index }))
      .sort((left, right) => right.score - left.score).slice(0, limit).map(({ memory }) => memory);
  }

  private terms(value: string): Set<string> { return new Set(value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z0-9]{3,}/g) ?? []); }
  private overlap(left: Set<string>, right: Set<string>): number { let score = 0; for (const term of left) if (right.has(term)) score++; return score; }
  private maxResponseTokens() { return this.config.get<number>('GUIDANCE_MAX_RESPONSE_TOKENS', 320); }

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
