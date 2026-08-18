import { GuidanceMessageRole } from '@prisma/client';
import { GuidancePromptService } from '../src/modules/guidance/guidance-prompt.service';
import { GuidanceService } from '../src/modules/guidance/guidance.service';

describe('GuidanceService', () => {
  let prisma: any;
  let llm: any;
  let service: GuidanceService;
  const conversation = { id: 'conversation-id', userId: 'user-a' };
  const coach = {
    name: 'Alex', traits: ['EMPATHETIC'], personality: null, speakingStyle: 'warm', adviceStyle: 'practical',
    humorLevel: 30, empathyLevel: 90, directnessLevel: 60, energyLevel: 50, customInstructions: null,
  };

  beforeEach(() => {
    const tx = {
      guidanceMessage: { create: jest.fn(async ({ data }) => ({ id: 'created', isDeleted: false, ...data })) },
      guidanceConversation: {
        create: jest.fn(async ({ data }) => ({ id: 'created-conversation', ...data })),
        update: jest.fn(),
      },
      coachDailyCheckIn: { update: jest.fn() },
    };
    prisma = {
      guidanceConversation: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
      guidanceMessage: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      coach: { findUnique: jest.fn().mockResolvedValue(coach) },
      profile: { findUnique: jest.fn().mockResolvedValue(null) },
      soulprint: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
      userMemory: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
      $transaction: jest.fn((callback) => callback(tx)),
      __tx: tx,
    };
    llm = {
      name: 'ollama', model: 'llama3.1:8b',
      complete: jest.fn().mockResolvedValue({ content: 'Coach reply', provider: 'ollama', model: 'llama3.1:8b' }),
      stream: jest.fn().mockImplementation(async function* () { yield 'Coach '; yield 'reply'; }),
    };
    const config = { get: jest.fn((_key: string, fallback: unknown) => fallback) } as any;
    service = new GuidanceService(prisma, new GuidancePromptService(), config, llm);
  });

  it('scopes conversation history to its owner', async () => {
    prisma.guidanceConversation.findFirst.mockResolvedValue(null);
    await expect(service.history('user-b', 'conversation-id')).rejects.toMatchObject({ code: 'CONVERSATION_NOT_FOUND' });
    expect(prisma.guidanceMessage.findMany).not.toHaveBeenCalled();
  });

  it('opens a new conversation with a warm coach-led question', async () => {
    prisma.profile.findUnique.mockResolvedValue({ firstName: 'Sam' });
    const created = await service.createConversation('user-a', 'Getting to know me');
    expect(created).toMatchObject({ id: 'created-conversation', userId: 'user-a' });
    expect(prisma.__tx.guidanceMessage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        role: GuidanceMessageRole.ASSISTANT,
        content: expect.stringContaining('Hi Sam'),
      }),
    });
  });

  it('lists active conversations with abandoned drafts after real exchanges', async () => {
    prisma.guidanceConversation.findMany.mockResolvedValue([]);
    await service.listConversations('user-a');
    expect(prisma.guidanceConversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { lastMessageAt: { sort: 'desc', nulls: 'last' } },
          { id: 'desc' },
        ],
      }),
    );
  });

  it('generates a proactive daily prompt across the relationship discovery areas', async () => {
    prisma.guidanceConversation.findFirst.mockResolvedValue(conversation);
    prisma.guidanceMessage.findMany.mockResolvedValue([]);
    await service.createDailyCoachMessage('user-a', 'check-in-a', '2026-08-10');
    expect(llm.complete).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        role: 'system',
        content: expect.stringContaining('personality, emotional patterns, dating history'),
      }),
    ]), expect.objectContaining({ priority: 'background', feature: 'coach_check_in', userId: 'user-a' }));
    expect(prisma.__tx.coachDailyCheckIn.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'check-in-a' },
      data: expect.objectContaining({ status: 'SENT', messageId: 'created' }),
    }));
  });

  it('persists both sides of a non-streamed exchange', async () => {
    prisma.guidanceConversation.findFirst.mockResolvedValue(conversation);
    prisma.guidanceMessage.findMany.mockResolvedValue([{ role: GuidanceMessageRole.USER, content: 'Help me', isDeleted: false }]);
    await service.send('user-a', conversation.id, 'Help me');
    expect(prisma.__tx.guidanceMessage.create).toHaveBeenNthCalledWith(1, { data: expect.objectContaining({ role: GuidanceMessageRole.USER }) });
    expect(prisma.__tx.guidanceMessage.create).toHaveBeenNthCalledWith(2, { data: expect.objectContaining({ role: GuidanceMessageRole.ASSISTANT, provider: 'ollama' }) });
    expect(llm.complete).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ role: 'system' })]), expect.objectContaining({ priority: 'interactive', feature: 'guidance', userId: 'user-a' }));
  });

  it('streams tokens and persists the final assistant response', async () => {
    prisma.guidanceConversation.findFirst.mockResolvedValue(conversation);
    prisma.guidanceMessage.findMany.mockResolvedValue([]);
    const events = [];
    for await (const event of service.stream('user-a', conversation.id, 'Hello')) events.push(event);
    expect(events.map((item) => item.event)).toEqual(['message', 'token', 'token', 'complete']);
    expect(prisma.__tx.guidanceMessage.create).toHaveBeenLastCalledWith({ data: expect.objectContaining({ content: 'Coach reply' }) });
  });

  it('only allows the owner to edit user messages', async () => {
    prisma.guidanceMessage.findFirst.mockResolvedValue({ id: 'message-id', role: GuidanceMessageRole.ASSISTANT, isDeleted: false });
    await expect(service.updateMessage('user-a', 'message-id', 'Changed')).rejects.toMatchObject({ code: 'MESSAGE_NOT_EDITABLE' });
  });

  it('soft-deletes messages without retaining exposed content', async () => {
    prisma.guidanceMessage.findFirst.mockResolvedValue({ id: 'message-id', role: GuidanceMessageRole.USER, isDeleted: false });
    prisma.guidanceMessage.update.mockResolvedValue({ id: 'message-id', content: null, isDeleted: true });
    await expect(service.deleteMessage('user-a', 'message-id')).resolves.toMatchObject({ content: null, isDeleted: true });
  });
});

describe('GuidancePromptService', () => {
  const coach = (overrides: Record<string, unknown>) => ({
    name: 'Alex', traits: [], personality: null, speakingStyle: null, adviceStyle: null,
    humorLevel: 50, empathyLevel: 50, directnessLevel: 50, energyLevel: 50,
    customInstructions: null, ...overrides,
  }) as any;

  it('includes coach settings, memories, and Soulprint in the private system prompt', () => {
    const prompt = new GuidancePromptService().buildSystemPrompt({
      coach: { name: 'Alex', traits: ['DIRECT'], personality: null, speakingStyle: 'casual', adviceStyle: null, humorLevel: 40, empathyLevel: 80, directnessLevel: 70, energyLevel: 50, customInstructions: null } as any,
      profile: null,
      soulprint: { summary: 'Values emotional honesty' } as any,
      memories: [{ content: 'Has a date on Friday' }] as any,
    });
    expect(prompt).toContain('Alex');
    expect(prompt).toContain('Values emotional honesty');
    expect(prompt).toContain('Has a date on Friday');
  });

  it('turns a direct high-energy coach into concise and action-oriented behavior', () => {
    const prompt = new GuidancePromptService().buildSystemPrompt({
      coach: coach({
        traits: ['DIRECT', 'MORE_DIRECTIVE', 'FUNNY'],
        humorLevel: 90,
        empathyLevel: 25,
        directnessLevel: 90,
        energyLevel: 90,
      }),
      profile: null,
      soulprint: null,
      memories: [],
    });
    expect(prompt).toContain('prefer concise answers of 2–4 short paragraphs');
    expect(prompt).toContain('say the difficult truth plainly');
    expect(prompt).toContain('usually zero or one targeted question');
    expect(prompt).toContain('recommend a specific action');
    expect(prompt).toContain('one or two fitting emojis occasionally');
  });

  it('turns a soft reflective coach into reassuring, exploratory behavior', () => {
    const prompt = new GuidancePromptService().buildSystemPrompt({
      coach: coach({
        traits: ['SOFT', 'EMPATHETIC', 'THERAPIST', 'LESS_DIRECTIVE', 'SERIOUS'],
        humorLevel: 10,
        empathyLevel: 95,
        directnessLevel: 15,
        energyLevel: 20,
      }),
      profile: null,
      soulprint: null,
      memories: [],
    });
    expect(prompt).toContain('specific emotional validation');
    expect(prompt).toContain('ask permission before a strong challenge');
    expect(prompt).toContain('one or two open, reflective questions');
    expect(prompt).toContain('help the user reach their own conclusion');
    expect(prompt).toContain('do not use emojis unless the user uses them first');
  });

  it('uses selected peer-vibe traits to change vocabulary', () => {
    const prompt = new GuidancePromptService().buildSystemPrompt({
      coach: coach({ traits: ['BRO_VIBE'], speakingStyle: 'casual and upbeat' }),
      profile: null,
      soulprint: null,
      memories: [],
    });
    expect(prompt).toContain('relaxed, friendly, conversational language');
    expect(prompt).toContain('casual and upbeat');
  });

  it('guides a natural, progressive relationship discovery instead of an interview', () => {
    const prompt = new GuidancePromptService().buildSystemPrompt({
      coach: coach({}),
      profile: null,
      soulprint: null,
      memories: [],
    });
    expect(prompt).toContain('personality; recurring emotional patterns; dating and relationship history');
    expect(prompt).toContain('relationship goals; communication style; non-clinical attachment tendencies');
    expect(prompt).toContain('Never run through these areas as a checklist or interview');
    expect(prompt).toContain('Ask one clear question at a time');
    expect(prompt).toContain('Actively lead like a trusted advisor');
    expect(prompt).toContain('never a diagnosis or fixed identity');
  });
});
