import { apiClient } from '@/api/client';
import type { MatchDecision, SoulMatch } from '../types/soul.types';
export const soulApi = {
  matches: async () => (await apiClient.get<SoulMatch[]>('/users/matches')).data,
  respond: async (matchedUserId: string, response: 'ACCEPTED' | 'REJECTED') =>
    (await apiClient.post(`/users/matches/${matchedUserId}/respond`, { response })).data,
  history: async () => (await apiClient.get<MatchDecision[]>('/users/matches/history')).data,
};
