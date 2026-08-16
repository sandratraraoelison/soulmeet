import { create } from 'zustand';
import type { SocketState } from '../types/chat.types';

type ChatState = {
  connection: SocketState;
  activeConversationId: string | null;
  typingByConversation: Record<string, string | undefined>;
  setConnection: (connection: SocketState) => void;
  setActiveConversation: (id: string | null) => void;
  setTyping: (conversationId: string, userId?: string) => void;
  reset: () => void;
};

export const useChatStore = create<ChatState>((set) => ({
  connection: 'disconnected',
  activeConversationId: null,
  typingByConversation: {},
  setConnection: (connection) => set({ connection }),
  setActiveConversation: (activeConversationId) => set({ activeConversationId }),
  setTyping: (conversationId, userId) =>
    set((state) => ({
      typingByConversation: { ...state.typingByConversation, [conversationId]: userId },
    })),
  reset: () => ({ connection: 'disconnected', activeConversationId: null, typingByConversation: {} }),
}));
