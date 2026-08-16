import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';
import type { GuidanceMode } from '../types/guidance.types';

const draftKey = (id: string) => `soulmeet.guidance.draft.${id}`;
const webDrafts = new Map<string, string>();
const draftStorage = {
  get: (key: string) => Platform.OS === 'web' ? Promise.resolve(webDrafts.get(key) ?? null) : SecureStore.getItemAsync(key),
  set: (key: string, value: string) => Platform.OS === 'web' ? Promise.resolve(void webDrafts.set(key, value)) : SecureStore.setItemAsync(key, value),
  remove: (key: string) => Platform.OS === 'web' ? Promise.resolve(void webDrafts.delete(key)) : SecureStore.deleteItemAsync(key),
};

type GuidanceUiState = {
  activeMode: GuidanceMode | null;
  drafts: Record<string, string>;
  setMode: (mode: GuidanceMode | null) => void;
  loadDraft: (conversationId: string) => Promise<void>;
  setDraft: (conversationId: string, value: string) => Promise<void>;
  clearDraft: (conversationId: string) => Promise<void>;
};

export const useGuidanceStore = create<GuidanceUiState>((set) => ({
  activeMode: null,
  drafts: {},
  setMode: (activeMode) => set({ activeMode }),
  loadDraft: async (conversationId) => {
    try {
      const value = await draftStorage.get(draftKey(conversationId));
      if (value !== null) set((state) => ({ drafts: { ...state.drafts, [conversationId]: value } }));
    } catch { /* A draft must never block Guidance. */ }
  },
  setDraft: async (conversationId, value) => {
    set((state) => ({ drafts: { ...state.drafts, [conversationId]: value } }));
    try { await draftStorage.set(draftKey(conversationId), value); } catch { /* Keep the in-memory draft. */ }
  },
  clearDraft: async (conversationId) => {
    set((state) => {
      const drafts = { ...state.drafts };
      delete drafts[conversationId];
      return { drafts };
    });
    try { await draftStorage.remove(draftKey(conversationId)); } catch { /* Already cleared in memory. */ }
  },
}));
