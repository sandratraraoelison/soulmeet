import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import { conversationRoom } from './constants/chat-events.constants';

@Injectable()
export class ChatRealtimeService {
  private server?: Server;
  bind(server: Server) {
    this.server = server;
  }
  emit(conversationId: string, event: string, payload: object) {
    this.server?.to(conversationRoom(conversationId)).emit(event, payload);
  }
}
