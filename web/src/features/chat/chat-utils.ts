import type { InfiniteData } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import type { ChatMessage } from '@/types';

export type MessagePage = { messages: ChatMessage[]; nextCursor: string | null };

export type SocketHandler = (...args: never[]) => void;

export function subscribeSocketEvents<T extends Record<string, SocketHandler>>(
  socket: Socket,
  listeners: T,
): () => void {
  for (const [event, handler] of Object.entries(listeners)) {
    socket.on(event, handler as never);
  }
  return () => {
    for (const [event, handler] of Object.entries(listeners)) {
      socket.off(event, handler as never);
    }
  };
}

export const upsertMessage = (
  data: InfiniteData<MessagePage> | undefined,
  incoming: ChatMessage,
): InfiniteData<MessagePage> | undefined => {
  if (!data) return data;
  let found = false;
  const pages = data.pages.map((page) => ({
    ...page,
    messages: page.messages.map((message) => {
      if (
        message.id === incoming.id ||
        (incoming.clientMessageId && message.clientMessageId === incoming.clientMessageId)
      ) {
        found = true;
        return incoming;
      }
      return message;
    }),
  }));
  if (!found && pages[0]) pages[0] = { ...pages[0], messages: [incoming, ...pages[0].messages] };
  return { ...data, pages };
};

export const upsertMessageList = (
  data: MessagePage | undefined,
  incoming: ChatMessage,
): MessagePage | undefined => {
  if (!data) return data;
  let found = false;
  const messages = data.messages.map((message) => {
    if (
      message.id === incoming.id ||
      (incoming.clientMessageId && message.clientMessageId === incoming.clientMessageId)
    ) {
      found = true;
      return incoming;
    }
    return message;
  });
  return { ...data, messages: found ? messages : [incoming, ...messages] };
};

export const patchMessageList = (
  data: MessagePage | undefined,
  messageId: string,
  patch: Partial<ChatMessage>,
): MessagePage | undefined => {
  if (!data) return data;
  return {
    ...data,
    messages: data.messages.map((message) =>
      message.id === messageId ? { ...message, ...patch } : message,
    ),
  };
};

export const patchMessage = (
  data: InfiniteData<MessagePage> | undefined,
  messageId: string,
  patch: Partial<ChatMessage>,
) => {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      messages: page.messages.map((message) =>
        message.id === messageId ? { ...message, ...patch } : message,
      ),
    })),
  };
};

export const chatErrorMessage = (code?: string) =>
  ({
    FORBIDDEN_CONVERSATION: 'You do not have access to this conversation.',
    EDIT_WINDOW_EXPIRED: 'This message can no longer be edited.',
    DELETE_WINDOW_EXPIRED: 'This message can no longer be deleted.',
    USER_BLOCKED: 'This conversation is no longer available.',
  })[code ?? ''] ?? 'Unable to send the message. Tap to try again.';
