import { useCallback, useEffect, useState } from 'react';
import * as Crypto from 'expo-crypto';
import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { chatApi } from '../api/chat.api';
import { CHAT_EVENTS } from '../constants/chat-events';
import { connectChatSocket, getChatSocket } from '../services/chat.socket';
import { useChatStore } from '../store/chat.store';
import type { ChatError, Message, MessagePage } from '../types/chat.types';
import {
  chatErrorMessage,
  patchMessage,
  subscribeSocketEvents,
  upsertMessage,
} from '../utils/chat.utils';

export const chatKeys = {
  conversations: ['chat', 'conversations'] as const,
  conversation: (id: string) => ['chat', 'conversation', id] as const,
  messages: (id: string) => ['chat', 'messages', id] as const,
};

export function useConversations(currentUserId?: string) {
  return useQuery({
    queryKey: chatKeys.conversations,
    queryFn: () => chatApi.getConversations(currentUserId),
  });
}

export function useConversation(conversationId: string, currentUserId?: string) {
  return useQuery({
    queryKey: chatKeys.conversation(conversationId),
    queryFn: () => chatApi.getConversation(conversationId, currentUserId),
  });
}

export function useConversationMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: chatKeys.messages(conversationId),
    queryFn: ({ pageParam }) =>
      chatApi.getConversationMessages(conversationId, pageParam, 20),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useChatSocketLifecycle(enabled: boolean) {
  const queryClient = useQueryClient();
  const setConnection = useChatStore((state) => state.setConnection);
  const setTyping = useChatStore((state) => state.setTyping);

  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    let unsubscribe: (() => void) | null = null;
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    void connectChatSocket().then((socket) => {
      if (!mounted) return;
      setConnection(socket.connected ? 'connected' : 'connecting');
      unsubscribe = subscribeSocketEvents(socket, {
        connect: () => {
          setConnection('connected');
          const active = useChatStore.getState().activeConversationId;
          if (active) socket.emit(CHAT_EVENTS.join, { conversationId: active });
          void queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
          if (active) void queryClient.invalidateQueries({ queryKey: chatKeys.messages(active) });
        },
        disconnect: () => setConnection('reconnecting'),
        [CHAT_EVENTS.created]: ({ message }: { message: Message }) => {
          queryClient.setQueryData<InfiniteData<MessagePage>>(
            chatKeys.messages(message.conversationId),
            (data) => upsertMessage(data, message),
          );
          void queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
        },
        [CHAT_EVENTS.updated]: ({ message }: { message: Message }) =>
          queryClient.setQueryData<InfiniteData<MessagePage>>(
            chatKeys.messages(message.conversationId),
            (data) => upsertMessage(data, message),
          ),
        [CHAT_EVENTS.deleted]: (payload: {
          messageId: string;
          conversationId: string;
          deletedAt: string;
        }) => {
          queryClient.setQueryData<InfiniteData<MessagePage>>(
            chatKeys.messages(payload.conversationId),
            (data) =>
              patchMessage(data, payload.messageId, {
                content: null,
                isDeleted: true,
                deletedAt: payload.deletedAt,
              }),
          );
          void queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
        },
        [CHAT_EVENTS.delivered]: (payload: {
          messageId: string;
          conversationId: string;
        }) =>
          queryClient.setQueryData<InfiniteData<MessagePage>>(
            chatKeys.messages(payload.conversationId),
            (data) => patchMessage(data, payload.messageId, { status: 'DELIVERED' }),
          ),
        [CHAT_EVENTS.readReceipt]: (payload: {
          messageIds: string[];
          conversationId: string;
        }) =>
          queryClient.setQueryData<InfiniteData<MessagePage>>(
            chatKeys.messages(payload.conversationId),
            (data) =>
              payload.messageIds.reduce(
                (current, id) => patchMessage(current, id, { status: 'READ' }),
                data,
              ),
          ),
        [CHAT_EVENTS.typingStarted]: (payload: {
          conversationId: string;
          userId: string;
        }) => {
          setTyping(payload.conversationId, payload.userId);
          const previous = timers.get(payload.conversationId);
          if (previous) clearTimeout(previous);
          timers.set(
            payload.conversationId,
            setTimeout(() => setTyping(payload.conversationId), 3_000),
          );
        },
        [CHAT_EVENTS.typingStopped]: (payload: { conversationId: string }) =>
          setTyping(payload.conversationId),
      });
    });
    return () => {
      mounted = false;
      timers.forEach(clearTimeout);
      unsubscribe?.();
    };
  }, [enabled, queryClient, setConnection, setTyping]);
}

export function useConversationSocket(conversationId: string, currentUserId?: string) {
  const queryClient = useQueryClient();
  const setActive = useChatStore((state) => state.setActiveConversation);
  useEffect(() => {
    setActive(conversationId);
    void getChatSocket().then((socket) => {
      socket.emit(CHAT_EVENTS.join, { conversationId });
      const data = queryClient.getQueryData<InfiniteData<MessagePage>>(chatKeys.messages(conversationId));
      const unread = data?.pages.flatMap((page) => page.messages).filter(
        (message) => message.senderId !== currentUserId && message.status !== 'READ',
      );
      if (unread?.length)
        socket.emit(CHAT_EVENTS.read, {
          conversationId,
          messageIds: unread.map((message) => message.id),
        });
    });
    return () => {
      setActive(null);
      void getChatSocket().then((socket) => {
        socket.emit(CHAT_EVENTS.typingStop, { conversationId });
        socket.emit(CHAT_EVENTS.leave, { conversationId });
      });
    };
  }, [conversationId, currentUserId, queryClient, setActive]);
}

export function useConversationPresence(conversationId: string) {
  const [online, setOnline] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const socket = await getChatSocket();
      if (!socket.connected || !active) {
        if (active) setOnline(false);
        return;
      }
      socket.timeout(4_000).emit(
        CHAT_EVENTS.presenceGet,
        { conversationId },
        (error: Error | null, response?: { success: boolean; online?: boolean }) => {
          if (active)
            setOnline(
              !error && response?.success === true && response.online === true,
            );
        },
      );
    };
    void refresh();
    const interval = setInterval(() => void refresh(), 10_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [conversationId]);
  return online;
}

export function useSendMessage(conversationId: string, senderId: string) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const send = useCallback(
    async (rawContent: string, existingClientId?: string) => {
      const content = rawContent.trim().slice(0, 2_000);
      if (!content) return;
      setError(null);
      const clientMessageId = existingClientId ?? Crypto.randomUUID();
      const optimistic: Message = {
        id: `pending:${clientMessageId}`,
        clientMessageId,
        conversationId,
        senderId,
        content,
        type: 'TEXT',
        status: 'PENDING',
        isEdited: false,
        editedAt: null,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      queryClient.setQueryData<InfiniteData<MessagePage>>(
        chatKeys.messages(conversationId),
        (data) => upsertMessage(data, optimistic),
      );
      const socket = await getChatSocket();
      socket.timeout(10_000).emit(
        CHAT_EVENTS.send,
        { conversationId, content, clientMessageId },
        (timeoutError: Error | null, response: { success: boolean; message?: Message; error?: ChatError }) => {
          if (timeoutError || !response?.success || !response.message) {
            queryClient.setQueryData<InfiniteData<MessagePage>>(
              chatKeys.messages(conversationId),
              (data) => patchMessage(data, optimistic.id, { status: 'FAILED' }),
            );
            setError(chatErrorMessage(response?.error?.code));
            return;
          }
          queryClient.setQueryData<InfiniteData<MessagePage>>(
            chatKeys.messages(conversationId),
            (data) => upsertMessage(data, response.message!),
          );
        },
      );
      socket.emit(CHAT_EVENTS.typingStop, { conversationId });
    },
    [conversationId, queryClient, senderId],
  );
  return { send, error };
}

export function useEditMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => chatApi.updateMessage(id, content),
    onMutate: async ({ id, content }) => {
      const previous = queryClient.getQueryData<InfiniteData<MessagePage>>(chatKeys.messages(conversationId));
      queryClient.setQueryData(chatKeys.messages(conversationId), patchMessage(previous, id, { content, isEdited: true }));
      return { previous };
    },
    onError: (_error, _variables, context) => queryClient.setQueryData(chatKeys.messages(conversationId), context?.previous),
  });
}

export function useDeleteMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: chatApi.deleteMessage,
    onMutate: async (id) => {
      const previous = queryClient.getQueryData<InfiniteData<MessagePage>>(chatKeys.messages(conversationId));
      queryClient.setQueryData(chatKeys.messages(conversationId), patchMessage(previous, id, { content: null, isDeleted: true }));
      return { previous };
    },
    onError: (_error, _id, context) => queryClient.setQueryData(chatKeys.messages(conversationId), context?.previous),
  });
}
