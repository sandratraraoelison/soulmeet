'use client';
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, json } from '@/services/api';
import type { ChatMessage, Conversation } from '@/types';
import { CHAT_EVENTS } from './chat-events';
import { connectChatSocket, getChatSocket, isChatSocketReady, resetChatSocket } from './chat-socket';
import {
  type MessagePage,
  patchMessageList,
  subscribeSocketEvents,
  upsertMessageList,
} from './chat-utils';
import {
  getActiveConversationId,
  setActiveConversationId,
  setConnection,
  setTyping,
} from './chat-store';

export const chatKeys = {
  conversations: ['chat', 'conversations'] as const,
  conversation: (id: string) => ['chat', 'conversation', id] as const,
  messages: (id: string) => ['chat', 'messages', id] as const,
};

export function useConversations() {
  return useQuery({
    queryKey: chatKeys.conversations,
    queryFn: () => api<Conversation[]>('/conversations'),
  });
}

export function useConversation(conversationId: string) {
  return useQuery({
    queryKey: chatKeys.conversation(conversationId),
    queryFn: () => api<Conversation>(`/conversations/${conversationId}`),
  });
}

export function useChatSocketLifecycle(enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    let unsubscribe: (() => void) | null = null;
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    void getChatSocket()
      .then((socket) => {
        if (!mounted) return;
        setConnection(isChatSocketReady() ? 'connected' : 'connecting');
        unsubscribe = subscribeSocketEvents(socket, {
          [CHAT_EVENTS.ready]: () => {
            setConnection('connected');
            const active = getActiveConversationId();
            if (active) socket.emit(CHAT_EVENTS.join, { conversationId: active });
            void qc.invalidateQueries({ queryKey: chatKeys.conversations });
            if (active) void qc.invalidateQueries({ queryKey: chatKeys.messages(active) });
          },
          disconnect: () => setConnection('reconnecting'),
          [CHAT_EVENTS.created]: ({ message }: { message: ChatMessage }) => {
            qc.setQueryData<MessagePage>(chatKeys.messages(message.conversationId), (data) =>
              upsertMessageList(data, message),
            );
            void qc.invalidateQueries({ queryKey: chatKeys.conversations });
          },
          [CHAT_EVENTS.updated]: ({ message }: { message: ChatMessage }) =>
            qc.setQueryData<MessagePage>(chatKeys.messages(message.conversationId), (data) =>
              upsertMessageList(data, message),
            ),
          [CHAT_EVENTS.deleted]: (payload: {
            messageId: string;
            conversationId: string;
            deletedAt: string;
          }) => {
            qc.setQueryData<MessagePage>(chatKeys.messages(payload.conversationId), (data) =>
              patchMessageList(data, payload.messageId, {
                content: null,
                isDeleted: true,
              }),
            );
            void qc.invalidateQueries({ queryKey: chatKeys.conversations });
          },
          [CHAT_EVENTS.delivered]: (payload: {
            messageId: string;
            conversationId: string;
          }) =>
            qc.setQueryData<MessagePage>(chatKeys.messages(payload.conversationId), (data) =>
              patchMessageList(data, payload.messageId, { status: 'DELIVERED' }),
            ),
          [CHAT_EVENTS.readReceipt]: (payload: {
            messageIds: string[];
            conversationId: string;
          }) =>
            qc.setQueryData<MessagePage>(chatKeys.messages(payload.conversationId), (data) =>
              payload.messageIds.reduce(
                (current, id) => patchMessageList(current, id, { status: 'READ' }),
                data,
              ),
            ),
          [CHAT_EVENTS.typingStarted]: (payload: {
            conversationId: string;
            userId: string;
          }) => {
            setTyping(payload.conversationId, true);
            const previous = timers.get(payload.conversationId);
            if (previous) clearTimeout(previous);
            timers.set(
              payload.conversationId,
              setTimeout(() => setTyping(payload.conversationId, false), 3_000),
            );
          },
          [CHAT_EVENTS.typingStopped]: (payload: { conversationId: string }) =>
            setTyping(payload.conversationId, false),
        });
        socket.connect();
      })
      .catch(() => setConnection('error'));
    return () => {
      mounted = false;
      timers.forEach(clearTimeout);
      unsubscribe?.();
    };
  }, [enabled, qc]);
}

export function useConversationSocket(conversationId: string, currentUserId?: string) {
  const qc = useQueryClient();
  useEffect(() => {
    setActiveConversationId(conversationId);
    let joined = true;
    void connectChatSocket()
      .then((socket) => {
        if (!joined) return;
        socket.emit(CHAT_EVENTS.join, { conversationId });
        const data = qc.getQueryData<MessagePage>(chatKeys.messages(conversationId));
        const unread = (data?.messages ?? []).filter(
          (message) => message.senderId !== currentUserId && message.status !== 'READ',
        );
        if (unread.length)
          socket.emit(CHAT_EVENTS.read, {
            conversationId,
            messageIds: unread.map((message) => message.id),
          });
      })
      .catch(() => undefined);
    return () => {
      joined = false;
      if (getActiveConversationId() === conversationId) setActiveConversationId(null);
      void getChatSocket().then((socket) => {
        socket.emit(CHAT_EVENTS.typingStop, { conversationId });
        socket.emit(CHAT_EVENTS.leave, { conversationId });
      }).catch(() => undefined);
    };
  }, [conversationId, currentUserId, qc]);
}

export function useConversationPresence(conversationId: string) {
  const { data } = useQuery({
    queryKey: ['chat', 'presence', conversationId],
    queryFn: async () => {
      const socket = await getChatSocket();
      if (!isChatSocketReady()) return false;
      return new Promise<boolean>((resolve) => {
        socket.timeout(4_000).emit(
          CHAT_EVENTS.presenceGet,
          { conversationId },
          (error: Error | null, response?: { success?: boolean; online?: boolean }) => {
            resolve(!error && response?.success === true && response.online === true);
          },
        );
      });
    },
    refetchInterval: 10_000,
  });
  return data ?? false;
}

export function useSendMessage(conversationId: string, senderId: string) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (content: string) => {
      const clientMessageId = crypto.randomUUID();
      const pendingId = `pending:${clientMessageId}`;
      const optimistic: ChatMessage = {
        id: pendingId,
        clientMessageId,
        conversationId,
        senderId,
        content,
        type: 'TEXT',
        mediaUrl: null,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
      qc.setQueryData<MessagePage>(chatKeys.messages(conversationId), (data) =>
        upsertMessageList(data, optimistic),
      );
      let delivered: ChatMessage;
      try {
        const socket = await getChatSocket();
        if (!isChatSocketReady()) {
          socket.connect();
          throw new Error('socket_not_ready');
        }
        socket.emit(CHAT_EVENTS.typingStop, { conversationId });
        delivered = await new Promise<ChatMessage>((resolve, reject) => {
          socket.timeout(3_000).emit(
            CHAT_EVENTS.send,
            { conversationId, content, clientMessageId },
            (timeoutError: Error | null, response: { success?: boolean; message?: ChatMessage }) => {
              if (timeoutError || !response?.success || !response.message)
                reject(new Error('send_failed'));
              else resolve(response.message);
            },
          );
        });
      } catch (error) {
        try {
          const response = await api<{ message: ChatMessage }>(
            `/conversations/${conversationId}/messages`,
            json('POST', { content, clientMessageId }),
          );
          delivered = response.message;
        } catch {
          qc.setQueryData<MessagePage>(chatKeys.messages(conversationId), (data) =>
            patchMessageList(data, pendingId, { status: 'FAILED' }),
          );
          throw error;
        }
      }
      qc.setQueryData<MessagePage>(chatKeys.messages(conversationId), (data) =>
        upsertMessageList(data, delivered),
      );
      void qc.invalidateQueries({ queryKey: chatKeys.conversations });
      return delivered;
    },
  });
  return mutation;
}

export function useResetChatSocket() {
  useEffect(() => {
    return () => resetChatSocket();
  }, []);
}
