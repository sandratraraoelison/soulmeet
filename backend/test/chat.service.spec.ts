import { HttpStatus } from '@nestjs/common';
import { MessageStatus } from '@prisma/client';
import { ChatService } from '../src/modules/chat/chat.service';
import { CHAT_CONFIG } from '../src/modules/chat/constants/chat-config.constants';

const now = new Date();
const message = (overrides: Record<string, unknown> = {}) => ({
  id: 'message-id',
  conversationId: 'conversation-id',
  senderId: 'user-a',
  clientMessageId: 'client-id',
  content: 'Hello',
  type: 'TEXT',
  status: MessageStatus.SENT,
  isEdited: false,
  editedAt: null,
  isDeleted: false,
  deletedAt: null,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

describe('ChatService', () => {
  let prisma: any;
  let realtime: { emit: jest.Mock };
  let service: ChatService;

  beforeEach(() => {
    const tx = {
      message: { create: jest.fn(), updateMany: jest.fn() },
      conversation: { update: jest.fn() },
      conversationParticipant: { update: jest.fn() },
    };
    prisma = {
      user: { findFirst: jest.fn() },
      block: { findFirst: jest.fn().mockResolvedValue(null) },
      conversation: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      conversationParticipant: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      message: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(async (input: unknown) =>
        typeof input === 'function'
          ? (input as (client: typeof tx) => unknown)(tx)
          : Promise.all(input as Promise<unknown>[]),
      ),
      __tx: tx,
    };
    realtime = { emit: jest.fn() };
    service = new ChatService(prisma, realtime as any);
  });

  it('rejects a user outside the conversation', async () => {
    prisma.conversationParticipant.findUnique.mockResolvedValue(null);
    await expect(
      service.assertParticipant('conversation-id', 'outsider'),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN_CONVERSATION',
      status: HttpStatus.FORBIDDEN,
    });
  });

  it('returns the existing private conversation for the same pair', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'user-b' });
    prisma.conversation.findUnique.mockResolvedValue({
      id: 'existing',
      participants: [],
    });
    await expect(
      service.startPrivate('user-a', 'user-b'),
    ).resolves.toMatchObject({ id: 'existing' });
    expect(prisma.conversation.create).not.toHaveBeenCalled();
  });

  it('rejects blocked users', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'user-b' });
    prisma.block.findFirst.mockResolvedValue({ id: 'block-id' });
    await expect(
      service.startPrivate('user-a', 'user-b'),
    ).rejects.toMatchObject({ code: 'USER_BLOCKED' });
  });

  it('creates a message and updates lastMessageAt atomically', async () => {
    prisma.conversationParticipant.findUnique.mockResolvedValue({
      userId: 'user-a',
    });
    prisma.conversationParticipant.findFirst.mockResolvedValue({
      userId: 'user-b',
    });
    prisma.message.findUnique.mockResolvedValue(null);
    prisma.__tx.message.create.mockResolvedValue(message());
    const result = await service.send(
      'user-a',
      'conversation-id',
      '  Hello  ',
      'client-id',
    );
    expect(result.duplicate).toBe(false);
    expect(prisma.__tx.message.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ content: 'Hello' }),
    });
    expect(prisma.__tx.conversation.update).toHaveBeenCalled();
  });

  it('is idempotent for an existing clientMessageId', async () => {
    prisma.conversationParticipant.findUnique.mockResolvedValue({
      userId: 'user-a',
    });
    prisma.conversationParticipant.findFirst.mockResolvedValue({
      userId: 'user-b',
    });
    prisma.message.findUnique.mockResolvedValue(message());
    const result = await service.send(
      'user-a',
      'conversation-id',
      'Hello',
      'client-id',
    );
    expect(result.duplicate).toBe(true);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('prevents editing another user message', async () => {
    prisma.message.findUnique.mockResolvedValue(
      message({ senderId: 'user-b' }),
    );
    await expect(
      service.update('user-a', 'message-id', 'Changed'),
    ).rejects.toMatchObject({
      code: 'MESSAGE_NOT_OWNED',
    });
  });

  it('prevents editing a deleted message', async () => {
    prisma.message.findUnique.mockResolvedValue(
      message({ isDeleted: true, content: null }),
    );
    await expect(
      service.update('user-a', 'message-id', 'Changed'),
    ).rejects.toMatchObject({
      code: 'MESSAGE_ALREADY_DELETED',
    });
  });

  it('enforces the edit window', async () => {
    prisma.message.findUnique.mockResolvedValue(
      message({
        createdAt: new Date(Date.now() - CHAT_CONFIG.editWindowMs - 1),
      }),
    );
    await expect(
      service.update('user-a', 'message-id', 'Changed'),
    ).rejects.toMatchObject({
      code: 'EDIT_WINDOW_EXPIRED',
    });
  });

  it('soft deletes owned messages and emits a realtime event', async () => {
    prisma.message.findUnique.mockResolvedValue(message());
    prisma.message.update.mockResolvedValue(
      message({ isDeleted: true, content: null }),
    );
    const result = await service.delete('user-a', 'message-id');
    expect(result.isDeleted).toBe(true);
    expect(prisma.message.update).toHaveBeenCalledWith({
      where: { id: 'message-id' },
      data: expect.objectContaining({ content: null, isDeleted: true }),
    });
    expect(realtime.emit).toHaveBeenCalled();
  });

  it('never exposes deleted content in history and paginates by cursor', async () => {
    prisma.conversationParticipant.findUnique.mockResolvedValue({
      userId: 'user-a',
    });
    prisma.message.findMany.mockResolvedValue([
      message({ id: 'one' }),
      message({ id: 'two', isDeleted: true, content: 'secret' }),
      message({ id: 'three' }),
    ]);
    const result = await service.history(
      'conversation-id',
      'user-a',
      undefined,
      2,
    );
    expect(result.messages[1].content).toBeNull();
    expect(result.nextCursor).toBe('two');
    expect(prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 }),
    );
  });

  it('marks only received messages as read in one transaction', async () => {
    prisma.conversationParticipant.findUnique.mockResolvedValue({
      userId: 'user-a',
    });
    prisma.message.updateMany.mockResolvedValue({ count: 2 });
    prisma.conversationParticipant.update.mockResolvedValue({});
    const receipt = await service.read('user-a', 'conversation-id', [
      'one',
      'two',
    ]);
    expect(receipt.count).toBe(2);
    expect(prisma.message.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ senderId: { not: 'user-a' } }),
      data: { status: MessageStatus.READ },
    });
  });
});
