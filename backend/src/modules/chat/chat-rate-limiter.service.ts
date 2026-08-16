import { Injectable } from '@nestjs/common';
import { ChatException } from './chat.exception';
import { CHAT_CONFIG } from './constants/chat-config.constants';

/**
 * In-memory rate limiting for chat sockets: throttles typing broadcasts and
 * bounds how many messages a user can send within the configured window.
 */
@Injectable()
export class ChatRateLimiter {
  private readonly typingActivity = new Map<string, number>();
  private readonly sendActivity = new Map<string, number[]>();

  shouldEmitTyping(userId: string, conversationId: string, event: string): boolean {
    const key = `${userId}:${conversationId}:${event}`;
    const now = Date.now();
    if (now - (this.typingActivity.get(key) ?? 0) < CHAT_CONFIG.typingThrottleMs)
      return false;
    this.typingActivity.set(key, now);
    return true;
  }

  assertSendAllowed(userId: string) {
    const cutoff = Date.now() - CHAT_CONFIG.sendRateWindowMs;
    const recent = (this.sendActivity.get(userId) ?? []).filter(
      (timestamp) => timestamp > cutoff,
    );
    if (recent.length >= CHAT_CONFIG.sendRateLimit)
      throw new ChatException(
        'RATE_LIMITED',
        'Too many messages. Please slow down.',
      );
    recent.push(Date.now());
    this.sendActivity.set(userId, recent);
  }
}
