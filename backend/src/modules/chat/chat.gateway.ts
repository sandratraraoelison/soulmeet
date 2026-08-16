import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server } from 'socket.io';
import { ChatService } from './chat.service';
import { ChatRateLimiter } from './chat-rate-limiter.service';
import { ChatRealtimeService } from './chat-realtime.service';
import {
  CHAT_EVENTS,
  conversationRoom,
  userRoom,
} from './constants/chat-events.constants';
import {
  ConversationDto,
  DeleteMessageDto,
  ReadMessagesDto,
  SendMessageDto,
  UpdateMessageDto,
} from './dto/chat.dto';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import type { AuthenticatedSocket } from './interfaces/authenticated-socket.interface';
import { ChatException } from './chat.exception';
import { PushNotificationsService } from '../notifications/push-notifications.service';

type Ack = (response: object) => void;

@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chat: ChatService,
    private readonly auth: WsJwtGuard,
    private readonly realtime: ChatRealtimeService,
    private readonly notifications: PushNotificationsService,
    private readonly rateLimiter: ChatRateLimiter,
  ) {}

  afterInit(server: Server) {
    this.realtime.bind(server);
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const user = await this.auth.authenticate(client);
      await client.join(userRoom(user.id));
    } catch (error) {
      this.logger.warn(
        `Rejected socket connection: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      client.emit(CHAT_EVENTS.ERROR, {
        event: 'connection',
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired access token',
      });
      client.disconnect(true);
    }
  }

  @SubscribeMessage(CHAT_EVENTS.JOIN)
  async join(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: ConversationDto,
    ack?: Ack,
  ) {
    return this.run(CHAT_EVENTS.JOIN, client, ack, async () => {
      await this.chat.assertParticipant(
        dto.conversationId,
        client.data.user.id,
      );
      await client.join(conversationRoom(dto.conversationId));
      const payload = { conversationId: dto.conversationId };
      client.emit(CHAT_EVENTS.JOINED, payload);
      return payload;
    });
  }

  @SubscribeMessage(CHAT_EVENTS.LEAVE)
  async leave(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: ConversationDto,
    ack?: Ack,
  ) {
    return this.run(CHAT_EVENTS.LEAVE, client, ack, async () => {
      await client.leave(conversationRoom(dto.conversationId));
      return { conversationId: dto.conversationId };
    });
  }

  @SubscribeMessage(CHAT_EVENTS.PRESENCE_GET)
  async presence(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: ConversationDto,
    ack?: Ack,
  ) {
    return this.run(CHAT_EVENTS.PRESENCE_GET, client, ack, async () => {
      const participants = await this.chat.participantIds(dto.conversationId);
      if (!participants.includes(client.data.user.id))
        throw new ChatException(
          'FORBIDDEN_CONVERSATION',
          'You are not a participant in this conversation',
        );
      const otherUserId = participants.find((id) => id !== client.data.user.id);
      const sockets = otherUserId
        ? await this.server.in(userRoom(otherUserId)).fetchSockets()
        : [];
      return {
        conversationId: dto.conversationId,
        userId: otherUserId,
        online: sockets.length > 0,
      };
    });
  }

  @SubscribeMessage(CHAT_EVENTS.SEND)
  async send(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: SendMessageDto,
    ack?: Ack,
  ) {
    return this.run(CHAT_EVENTS.SEND, client, ack, async () => {
      this.rateLimiter.assertSendAllowed(client.data.user.id);
      const result = await this.chat.send(
        client.data.user.id,
        dto.conversationId,
        dto.content,
        dto.clientMessageId,
      );
      const participants = await this.chat.participantIds(dto.conversationId);
      const recipientId = participants.find((id) => id !== client.data.user.id);
      this.server
        .to(conversationRoom(dto.conversationId))
        .to(recipientId ? userRoom(recipientId) : '')
        .emit(CHAT_EVENTS.CREATED, { message: result.message });
      if (recipientId) {
        const connected = await this.server
          .in(userRoom(recipientId))
          .fetchSockets();
        if (connected.length) {
          await this.chat.markDelivered(result.message.id);
          this.server
            .to(conversationRoom(dto.conversationId))
            .emit(CHAT_EVENTS.DELIVERED, {
              messageId: result.message.id,
              conversationId: dto.conversationId,
            });
        }
        if (!result.duplicate) {
          const senderName = await this.chat.displayName(client.data.user.id);
          void this.notifications.send(recipientId, 'newMessages', {
            title: `New message from ${senderName}`,
            body: dto.content.slice(0, 140),
            data: { conversationId: dto.conversationId },
          });
        }
      }
      return { clientMessageId: dto.clientMessageId, message: result.message };
    });
  }

  @SubscribeMessage(CHAT_EVENTS.UPDATE)
  async update(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: UpdateMessageDto,
    ack?: Ack,
  ) {
    return this.run(CHAT_EVENTS.UPDATE, client, ack, () =>
      this.chat.update(client.data.user.id, dto.messageId, dto.content),
    );
  }

  @SubscribeMessage(CHAT_EVENTS.DELETE)
  async delete(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: DeleteMessageDto,
    ack?: Ack,
  ) {
    return this.run(CHAT_EVENTS.DELETE, client, ack, () =>
      this.chat.delete(client.data.user.id, dto.messageId),
    );
  }

  @SubscribeMessage(CHAT_EVENTS.READ)
  async read(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: ReadMessagesDto,
    ack?: Ack,
  ) {
    return this.run(CHAT_EVENTS.READ, client, ack, async () => {
      const receipt = await this.chat.read(
        client.data.user.id,
        dto.conversationId,
        dto.messageIds,
      );
      client
        .to(conversationRoom(dto.conversationId))
        .emit(CHAT_EVENTS.READ_RECEIPT, receipt);
      return receipt;
    });
  }

  @SubscribeMessage(CHAT_EVENTS.TYPING_START)
  typingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: ConversationDto,
    ack?: Ack,
  ) {
    return this.typing(
      CHAT_EVENTS.TYPING_START,
      CHAT_EVENTS.TYPING_STARTED,
      client,
      dto,
      ack,
    );
  }

  @SubscribeMessage(CHAT_EVENTS.TYPING_STOP)
  typingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: ConversationDto,
    ack?: Ack,
  ) {
    return this.typing(
      CHAT_EVENTS.TYPING_STOP,
      CHAT_EVENTS.TYPING_STOPPED,
      client,
      dto,
      ack,
    );
  }

  private typing(
    event: string,
    outgoingEvent: string,
    client: AuthenticatedSocket,
    dto: ConversationDto,
    ack?: Ack,
  ) {
    return this.run(event, client, ack, async () => {
      await this.chat.assertParticipant(
        dto.conversationId,
        client.data.user.id,
      );
      if (this.rateLimiter.shouldEmitTyping(client.data.user.id, dto.conversationId, event)) {
        client.to(conversationRoom(dto.conversationId)).emit(outgoingEvent, {
          conversationId: dto.conversationId,
          userId: client.data.user.id,
        });
      }
      return { conversationId: dto.conversationId };
    });
  }

  private async run(
    event: string,
    client: AuthenticatedSocket,
    ack: Ack | undefined,
    action: () => Promise<unknown>,
  ) {
    try {
      const data = await action();
      const response = { success: true, ...((data ?? {}) as object) };
      ack?.(response);
      return response;
    } catch (error) {
      const payload = {
        event,
        code: error instanceof ChatException ? error.code : 'VALIDATION_ERROR',
        message:
          error instanceof Error ? error.message : 'Chat operation failed',
        ...(error instanceof ChatException && error.details
          ? { details: error.details }
          : {}),
      };
      client.emit(CHAT_EVENTS.ERROR, payload);
      ack?.({ success: false, error: payload });
      return payload;
    }
  }
}
