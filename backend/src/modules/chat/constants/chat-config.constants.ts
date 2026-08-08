export const CHAT_CONFIG = {
  maxMessageLength: 2_000,
  editWindowMs: 15 * 60 * 1_000,
  deleteWindowMs: 15 * 60 * 1_000,
  typingThrottleMs: 500,
  sendRateWindowMs: 60_000,
  sendRateLimit: 30,
} as const;
