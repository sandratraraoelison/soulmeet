import { ChatGateway } from '../src/modules/chat/chat.gateway';
import { ChatRateLimiter } from '../src/modules/chat/chat-rate-limiter.service';
import { CHAT_EVENTS } from '../src/modules/chat/constants/chat-events.constants';

const client = () =>
  ({
    data: { user: { id: 'user-a', email: 'a@example.com' } },
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    to: jest.fn().mockReturnThis(),
  }) as any;

describe('ChatGateway', () => {
  let chat: any;
  let auth: any;
  let realtime: any;
  let server: any;
  let gateway: ChatGateway;

  beforeEach(() => {
    chat = {
      assertParticipant: jest.fn(),
      participantIds: jest.fn().mockResolvedValue(['user-a', 'user-b']),
      send: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      read: jest.fn(),
      markDelivered: jest.fn(),
    };
    auth = { authenticate: jest.fn() };
    realtime = { bind: jest.fn() };
    const broadcast = { to: jest.fn().mockReturnThis(), emit: jest.fn() };
    server = {
      to: jest.fn(() => broadcast),
      in: jest.fn(() => ({ fetchSockets: jest.fn().mockResolvedValue([{}]) })),
      __broadcast: broadcast,
    };
    gateway = new ChatGateway(chat, auth, realtime, { send: jest.fn() } as any, new ChatRateLimiter());
    gateway.server = server;
  });

  it('authenticates a socket and joins its personal room', async () => {
    const socket = client();
    auth.authenticate.mockResolvedValue({
      id: 'user-a',
      email: 'a@example.com',
    });
    await gateway.handleConnection(socket);
    expect(socket.join).toHaveBeenCalledWith('user:user-a');
  });

  it('refuses a socket with an invalid JWT', async () => {
    const socket = client();
    auth.authenticate.mockRejectedValue(new Error('Invalid token'));
    await gateway.handleConnection(socket);
    expect(socket.emit).toHaveBeenCalledWith(
      CHAT_EVENTS.ERROR,
      expect.objectContaining({ code: 'UNAUTHORIZED' }),
    );
    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });

  it('allows a participant to join and acknowledges it', async () => {
    const socket = client();
    const ack = jest.fn();
    await gateway.join(socket, { conversationId: 'conversation-id' }, ack);
    expect(chat.assertParticipant).toHaveBeenCalledWith(
      'conversation-id',
      'user-a',
    );
    expect(socket.join).toHaveBeenCalledWith('conversation:conversation-id');
    expect(ack).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        conversationId: 'conversation-id',
      }),
    );
  });

  it('does not let an outsider join a conversation', async () => {
    const socket = client();
    const ack = jest.fn();
    chat.assertParticipant.mockRejectedValue(new Error('Forbidden'));
    await gateway.join(socket, { conversationId: 'conversation-id' }, ack);
    expect(socket.join).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: expect.any(Object) }),
    );
  });

  it('broadcasts a created message and a delivered receipt', async () => {
    const socket = client();
    const created = { id: 'message-id', conversationId: 'conversation-id' };
    chat.send.mockResolvedValue({ message: created, duplicate: false });
    await gateway.send(socket, {
      conversationId: 'conversation-id',
      content: 'Hello',
      clientMessageId: '00000000-0000-4000-8000-000000000001',
    });
    expect(server.__broadcast.emit).toHaveBeenCalledWith(CHAT_EVENTS.CREATED, {
      message: created,
    });
    expect(chat.markDelivered).toHaveBeenCalledWith('message-id');
    expect(server.__broadcast.emit).toHaveBeenCalledWith(
      CHAT_EVENTS.DELIVERED,
      expect.objectContaining({ messageId: 'message-id' }),
    );
  });

  it('sends typing only to the other sockets in the conversation', async () => {
    const socket = client();
    await gateway.typingStart(socket, { conversationId: 'conversation-id' });
    expect(chat.assertParticipant).toHaveBeenCalled();
    expect(socket.to).toHaveBeenCalledWith('conversation:conversation-id');
    expect(socket.emit).toHaveBeenCalledWith(
      CHAT_EVENTS.TYPING_STARTED,
      expect.objectContaining({ userId: 'user-a' }),
    );
  });
});
