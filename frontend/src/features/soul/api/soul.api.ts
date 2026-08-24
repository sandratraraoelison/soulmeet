import { apiClient } from '@/api/client';
import type { MatchDecision, MatchmakingOverview, MatchResponseResult } from '../types/soul.types';
export const soulApi = {
  matches: async () => (await apiClient.get<MatchmakingOverview>('/users/matches')).data,
  activate: async () => (await apiClient.post<MatchmakingOverview>('/users/matches/activate')).data,
  respond: async (matchedUserId: string, response: 'ACCEPTED' | 'REJECTED') =>
    (await apiClient.post<MatchResponseResult>(`/users/matches/${matchedUserId}/respond`, { response })).data,
  history: async () => (await apiClient.get<MatchDecision[]>('/users/matches/history')).data,
};
