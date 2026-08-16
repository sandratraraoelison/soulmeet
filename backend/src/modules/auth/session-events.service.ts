import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';

export const SESSION_REVOKED_EVENT = 'session.revoked';

/**
 * In-process event bus decoupling session revocation (logout, password
 * change, admin suspension) from realtime consumers such as the chat
 * gateway, so active sockets are closed when a user's sessions are revoked.
 */
@Injectable()
export class SessionEventsService {
  private readonly emitter = new EventEmitter();

  onSessionRevoked(listener: (userId: string) => void): () => void {
    this.emitter.on(SESSION_REVOKED_EVENT, listener);
    return () => this.emitter.off(SESSION_REVOKED_EVENT, listener);
  }

  emitSessionRevoked(userId: string): void {
    this.emitter.emit(SESSION_REVOKED_EVENT, userId);
  }
}
