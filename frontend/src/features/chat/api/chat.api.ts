import { apiClient } from '@/api/client';
import type {
  Conversation,
  ConversationParticipant,
  DiscoverableUser,
  Message,
  MessagePage,
  PublicProfile,
} from '../types/chat.types';

type RawConversation = Omit<Conversation, 'otherParticipant' | 'lastMessage'> & {
  participants: ConversationParticipant[];
  messages?: Message[];
};

const mapConversation = (raw: RawConversation, currentUserId?: string): Conversation => {
  const other = raw.participants.find((item) => item.userId !== currentUserId) ?? raw.participants[0];
  return {
    ...raw,
    otherParticipant: {
      id: other?.userId ?? '',
      firstName: other?.user?.profile?.firstName ?? 'Soul',
      avatarUrl: null,
    },
    lastMessage: raw.messages?.[0] ?? null,
  };
};

export const chatApi = {
  getDiscoverableUsers: async () =>
    (await apiClient.get<DiscoverableUser[]>('/users/discover')).data,
  getPublicProfile: async (userId: string) =>
    (await apiClient.get<PublicProfile>(`/users/${userId}/public-profile`)).data,
  createPrivateConversation: async (participantId: string, currentUserId?: string) =>
    mapConversation(
      (await apiClient.post<RawConversation>('/conversations/private', { participantId })).data,
      currentUserId,
    ),
  getConversations: async (currentUserId?: string) => {
    const { data } = await apiClient.get<RawConversation[]>('/conversations');
    return data.map((item) => mapConversation(item, currentUserId));
  },
  getConversation: async (conversationId: string, currentUserId?: string) =>
    mapConversation(
      (await apiClient.get<RawConversation>(`/conversations/${conversationId}`)).data,
      currentUserId,
    ),
  getConversationMessages: async (conversationId: string, cursor?: string, limit = 20) =>
    (
      await apiClient.get<MessagePage>(`/conversations/${conversationId}/messages`, {
        params: { cursor, limit },
      })
    ).data,
  updateMessage: async (messageId: string, content: string) =>
    (await apiClient.patch<Message>(`/messages/${messageId}`, { content })).data,
  deleteMessage: async (messageId: string) =>
    (
      await apiClient.delete<{
        messageId: string;
        conversationId: string;
        isDeleted: true;
        deletedAt: string;
      }>(`/messages/${messageId}`)
    ).data,
};
