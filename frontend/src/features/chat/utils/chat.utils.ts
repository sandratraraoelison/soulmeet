import type { InfiniteData } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import type { Message, MessagePage } from '../types/chat.types';

type SocketHandler = (...args: never[]) => void;

/**
 * Subscribes a socket to a set of events and returns an unsubscribe function.
 * Use this inside effects so cleanup removes exactly the listeners added.
 */
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
  incoming: Message,
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

export const patchMessage = (
  data: InfiniteData<MessagePage> | undefined,
  messageId: string,
  patch: Partial<Message>,
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
