'use client';
import { useSyncExternalStore } from 'react';

export type Connection = 'connecting' | 'connected' | 'reconnecting' | 'error';

const listeners = new Set<() => void>();
let connection: Connection = 'connecting';
let activeConversationId: string | null = null;
const typing = new Map<string, boolean>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getConnection = () => connection;
export const getActiveConversationId = () => activeConversationId;
export const getTyping = (conversationId: string) => typing.get(conversationId) ?? false;

export const setConnection = (value: Connection) => {
  connection = value;
  emit();
};
export const setActiveConversationId = (value: string | null) => {
  activeConversationId = value;
};
export const setTyping = (conversationId: string, value = false) => {
  if (value) typing.set(conversationId, true);
  else typing.delete(conversationId);
  emit();
};

export function useChatConnection() {
  return useSyncExternalStore(subscribe, getConnection, () => 'connecting' as Connection);
}
export function useTypingStatus(conversationId: string) {
  return useSyncExternalStore(subscribe, () => getTyping(conversationId), () => false);
}