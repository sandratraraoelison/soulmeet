export const CHAT_EVENTS = {
  JOIN: 'conversation:join',
  LEAVE: 'conversation:leave',
  JOINED: 'conversation:joined',
  SEND: 'message:send',
  UPDATE: 'message:update',
  DELETE: 'message:delete',
  READ: 'message:read',
  CREATED: 'message:created',
  UPDATED: 'message:updated',
  DELETED: 'message:deleted',
  DELIVERED: 'message:delivered',
  READ_RECEIPT: 'message:read',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  TYPING_STARTED: 'typing:started',
  TYPING_STOPPED: 'typing:stopped',
  ERROR: 'chat:error',
} as const;

export const conversationRoom = (id: string) => `conversation:${id}`;
export const userRoom = (id: string) => `user:${id}`;
