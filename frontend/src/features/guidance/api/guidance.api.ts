import { apiClient } from '@/api/client';
import type { GuidanceApi, GuidanceConversation, GuidanceConversationListResponse, GuidanceMessagesResponse, GuidanceMessage, SendGuidanceMessageResponse } from '../types/guidance.types';

const generationControllers = new Map<string, AbortController>();

export const guidanceApi: GuidanceApi = {
  async getHomeSuggestion() {
    return (await apiClient.get<{ message: string }>('/guidance/suggestion')).data;
  },
  async createConversation(input = {}) {
    return (await apiClient.post<GuidanceConversation>('/guidance/conversations', { title: input.title })).data;
  },
  async getConversations(params) {
    return (await apiClient.get<GuidanceConversationListResponse>('/guidance/conversations', { params: { limit: params.limit, cursor: params.cursor, status: params.status } })).data;
  },
  async getConversation(conversationId) {
    return (await apiClient.get<GuidanceConversation>(`/guidance/conversations/${conversationId}`)).data;
  },
  async updateConversation(conversationId, input) {
    return (await apiClient.patch<GuidanceConversation>(`/guidance/conversations/${conversationId}`, input)).data;
  },
  async archiveConversation(conversationId) {
    return (await apiClient.post<GuidanceConversation>(`/guidance/conversations/${conversationId}/archive`)).data;
  },
  async deleteConversation(conversationId) {
    await apiClient.delete(`/guidance/conversations/${conversationId}`);
  },
  async getMessages(conversationId, params) {
    return (await apiClient.get<GuidanceMessagesResponse>(`/guidance/conversations/${conversationId}/messages`, { params: { limit: params.limit, cursor: params.cursor } })).data;
  },
  async getArchive(params) {
    return (await apiClient.get<GuidanceMessagesResponse>('/guidance/archive', { params })).data;
  },
  async sendMessage(conversationId, input) {
    return (await apiClient.post<SendGuidanceMessageResponse>(`/guidance/conversations/${conversationId}/messages`, { content: input.content })).data;
  },
  async updateMessage(messageId, input) {
    return (await apiClient.patch<GuidanceMessage>(`/guidance/messages/${messageId}`, input)).data;
  },
  async deleteMessage(messageId) { await apiClient.delete(`/guidance/messages/${messageId}`); },
  async regenerateMessage(_conversationId, input) {
    if (!input?.messageId) throw new Error('A message is required to regenerate a response.');
    return (await apiClient.post<GuidanceMessage>(`/guidance/messages/${input.messageId}/regenerate`)).data;
  },
  async stopGeneration(conversationId) {
    generationControllers.get(conversationId)?.abort();
    generationControllers.delete(conversationId);
  },
};

export function replaceGenerationController(conversationId: string) {
  generationControllers.get(conversationId)?.abort();
  const controller = new AbortController();
  generationControllers.set(conversationId, controller);
  return controller;
}

export function clearGenerationController(conversationId: string, controller: AbortController) {
  if (generationControllers.get(conversationId) === controller) generationControllers.delete(conversationId);
}
