export type ServerMessageStatus = 'SENT' | 'DELIVERED' | 'READ';
export type MessageStatus = 'PENDING' | ServerMessageStatus | 'FAILED';

export type Message = {
  id: string;
  clientMessageId?: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  type: 'TEXT';
  status: MessageStatus;
  isEdited: boolean;
  editedAt: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ConversationParticipant = {
  id: string;
  userId: string;
  conversationId: string;
  joinedAt: string;
  lastReadAt: string | null;
  user?: {
    id: string;
    profile?: { firstName: string } | null;
  };
};

export type Conversation = {
  id: string;
  type: 'PRIVATE';
  participants: ConversationParticipant[];
  otherParticipant: { id: string; firstName: string; avatarUrl?: string | null };
  lastMessage: Message | null;
  lastMessageAt: string | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
};

export type MessagePage = { messages: Message[]; nextCursor: string | null };
export type SocketState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
export type ChatError = { event: string; code: string; message: string; details?: object };

export type DiscoverableUser = {
  id: string;
  profile: { firstName: string; city: string; country: string };
};

export type PublicProfile = {
  id: string;
  profile: {
    firstName: string;
    city: string;
    country: string;
    occupation?: string | null;
    gender: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'NON_GENDERED' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  };
};
