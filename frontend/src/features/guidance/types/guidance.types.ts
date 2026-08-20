export type GuidanceMode =
  | 'MESSAGE_HELP'
  | 'CONVERSATION_ANALYSIS'
  | 'BEFORE_CONVERSATION'
  | 'AFTER_CONVERSATION'
  | 'DATE_PREPARATION'
  | 'RELATIONSHIP_ADVICE'
  | 'EMOTIONAL_SUPPORT';

export type GuidanceConversationStatus = 'ACTIVE' | 'ARCHIVED';
export type GuidanceMessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';

export interface GuidanceConversation {
  id: string;
  userId: string;
  title: string | null;
  status: GuidanceConversationStatus;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  messages?: GuidanceMessage[];
}

export interface GuidanceMessage {
  id: string;
  conversationId: string;
  role: GuidanceMessageRole;
  content: string | null;
  provider?: string | null;
  model?: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGuidanceConversationInput { title?: string; mode?: GuidanceMode }
export interface SendGuidanceMessageInput { content: string; mode?: GuidanceMode }
export interface UpdateGuidanceMessageInput { content: string }
export interface SendGuidanceMessageResponse { message: GuidanceMessage }
export interface GuidanceConversationListResponse {
  conversations: GuidanceConversation[];
  nextCursor: string | null;
}
export interface GuidanceMessagesResponse {
  messages: GuidanceMessage[];
  nextCursor: string | null;
}

export interface GuidanceApi {
  getHomeSuggestion(): Promise<{ message: string }>;
  createConversation(input?: CreateGuidanceConversationInput): Promise<GuidanceConversation>;
  getConversations(params: { page: number; limit: number; status?: GuidanceConversationStatus; cursor?: string }): Promise<GuidanceConversationListResponse>;
  getConversation(conversationId: string): Promise<GuidanceConversation>;
  updateConversation(conversationId: string, input: { title?: string }): Promise<GuidanceConversation>;
  archiveConversation(conversationId: string): Promise<GuidanceConversation>;
  deleteConversation(conversationId: string): Promise<void>;
  getMessages(conversationId: string, params: { page: number; limit: number; cursor?: string }): Promise<GuidanceMessagesResponse>;
  sendMessage(conversationId: string, input: SendGuidanceMessageInput): Promise<SendGuidanceMessageResponse>;
  updateMessage(messageId: string, input: UpdateGuidanceMessageInput): Promise<GuidanceMessage>;
  deleteMessage(messageId: string): Promise<void>;
  regenerateMessage(conversationId: string, input?: { messageId?: string }): Promise<GuidanceMessage>;
  stopGeneration(conversationId: string): Promise<void>;
}

export interface GuidanceSuggestion {
  id: string;
  mode: GuidanceMode;
  title: string;
  description: string;
  starter: string;
  icon: string;
}
