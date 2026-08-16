import { apiClient } from '@/api/client';
import type { SoulMatch } from '../types/soul.types';
export const soulApi = { matches: async () => (await apiClient.get<SoulMatch[]>('/users/matches')).data };
