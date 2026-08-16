import { apiClient } from './client';
import type { Coach, CoachInput } from '@/types/models';
export const coachApi = {
  get: async () => (await apiClient.get<Coach>('/coach')).data,
  create: async (input: CoachInput) =>
    (await apiClient.post<Coach>('/coach', input)).data,
  update: async (input: Partial<CoachInput>) =>
    (await apiClient.put<Coach>('/coach', input)).data,
};
