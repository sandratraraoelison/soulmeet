import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import { SessionEventsService } from '../auth/session-events.service';
import { conversationRoom, userRoom } from './constants/chat-events.constants';

@Injectable()
export class ChatRealtimeService implements OnModuleInit, OnModuleDestroy {
  private server?: Server;
  private unsubscribe?: () => void;

  constructor(private readonly sessionEvents: SessionEventsService) {}

  onModuleInit() {
    this.unsubscribe = this.sessionEvents.onSessionRevoked((userId) => {
      void this.disconnectUserSockets(userId);
    });
  }

  onModuleDestroy() {
    this.unsubscribe?.();
  }

  bind(server: Server) {
    this.server = server;
  }

  emit(conversationId: string, event: string, payload: object) {
    this.server?.to(conversationRoom(conversationId)).emit(event, payload);
  }

  async disconnectUserSockets(userId: string): Promise<void> {
    if (!this.server) return;
    const sockets = await this.server.in(userRoom(userId)).fetchSockets();
    for (const socket of sockets) (socket as unknown as Socket).disconnect(true);
  }
}
