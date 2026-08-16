import { InfiniteData, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { guidanceApi } from '../api/guidance.api';
import { guidanceKeys } from '../api/guidance.query-keys';
import { streamGuidanceMessage } from '../api/guidance.stream';
import type { GuidanceConversationListResponse, GuidanceMessage, GuidanceMessagesResponse, SendGuidanceMessageInput } from '../types/guidance.types';

export function useGuidanceConversations(status: 'ACTIVE' | 'ARCHIVED' = 'ACTIVE') {
  return useInfiniteQuery({
    queryKey: guidanceKeys.conversationList({ status }),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => guidanceApi.getConversations({ page: 1, limit: 20, status, cursor: pageParam }),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}

export function useGuidanceMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: guidanceKeys.messages(conversationId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => guidanceApi.getMessages(conversationId, { page: 1, limit: 30, cursor: pageParam }),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(conversationId),
  });
}

export function useCreateGuidanceConversation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: guidanceApi.createConversation,
    onSuccess: () => client.invalidateQueries({ queryKey: guidanceKeys.conversations() }),
  });
}

const addNewest = (data: InfiniteData<GuidanceMessagesResponse> | undefined, message: GuidanceMessage) => {
  if (!data?.pages[0]) return data;
  if (data.pages.some((page) => page.messages.some((item) => item.id === message.id))) return data;
  const pages = [...data.pages];
  const first = pages[0]!;
  pages[0] = { ...first, messages: [message, ...first.messages] };
  return { ...data, pages };
};

export function useSendGuidanceMessage(conversationId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: SendGuidanceMessageInput) => guidanceApi.sendMessage(conversationId, input),
    onSuccess: ({ message }) => {
      client.setQueryData<InfiniteData<GuidanceMessagesResponse>>(guidanceKeys.messages(conversationId), (data) => addNewest(data, message));
      void client.invalidateQueries({ queryKey: guidanceKeys.conversations() });
    },
  });
}

export function useGuidanceStream(conversationId: string) {
  const client = useQueryClient();
  const [streamingText, setStreamingText] = useState('');
  const mutation = useMutation({
    mutationFn: async (input: SendGuidanceMessageInput) => {
      let complete: GuidanceMessage | null = null;
      let streamed = '';
      let userSaved = false;
      setStreamingText('');
      try {
        await streamGuidanceMessage(conversationId, input, {
          onUserMessage: (message) => {
            userSaved = true;
            client.setQueryData<InfiniteData<GuidanceMessagesResponse>>(guidanceKeys.messages(conversationId), (data) => addNewest(data, message));
          },
          onToken: (token) => { streamed += token; setStreamingText(streamed); },
          onComplete: (message) => { complete = message; },
        });
      } catch (error) {
        if (userSaved) throw error;
        const fallback = await guidanceApi.sendMessage(conversationId, input);
        complete = fallback.message;
        streamed = fallback.message.content ?? '';
      }
      if (!complete) throw new Error('The coach response was interrupted.');
      return { message: complete as GuidanceMessage, streamed };
    },
    onSuccess: ({ message }) => {
      client.setQueryData<InfiniteData<GuidanceMessagesResponse>>(guidanceKeys.messages(conversationId), (data) => addNewest(data, message));
      setStreamingText('');
      void client.invalidateQueries({ queryKey: guidanceKeys.conversations() });
    },
  });
  return { ...mutation, streamingText };
}

export function useUpdateGuidanceMessage(conversationId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => guidanceApi.updateMessage(id, { content }),
    onSuccess: () => client.invalidateQueries({ queryKey: guidanceKeys.messages(conversationId) }),
  });
}

export function useDeleteGuidanceMessage(conversationId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: guidanceApi.deleteMessage,
    onSuccess: () => client.invalidateQueries({ queryKey: guidanceKeys.messages(conversationId) }),
  });
}

export function useRegenerateGuidanceMessage(conversationId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => guidanceApi.regenerateMessage(conversationId, { messageId }),
    onSuccess: () => client.invalidateQueries({ queryKey: guidanceKeys.messages(conversationId) }),
  });
}

export function useRenameGuidanceConversation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => guidanceApi.updateConversation(id, { title }),
    onSuccess: (conversation) => {
      client.setQueryData(guidanceKeys.conversation(conversation.id), conversation);
      void client.invalidateQueries({ queryKey: guidanceKeys.conversations() });
    },
  });
}

export function useArchiveGuidanceConversation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: guidanceApi.archiveConversation,
    onSuccess: () => client.invalidateQueries({ queryKey: guidanceKeys.conversations() }),
  });
}

export function useDeleteGuidanceConversation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: guidanceApi.deleteConversation,
    onSuccess: () => client.invalidateQueries({ queryKey: guidanceKeys.conversations() }),
  });
}

export type { GuidanceConversationListResponse };
