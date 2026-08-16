import { apiClient } from '@/api/client';
import type { CreateGrowthGoalInput, GrowthCheckInInput, GrowthGoal, GrowthOverview, GrowthPreference } from '../types/growth.types';

export const growthApi = {
  overview: async () => (await apiClient.get<GrowthOverview>('/growth')).data,
  createGoal: async (input: CreateGrowthGoalInput) => (await apiClient.post<GrowthGoal>('/growth/goals', input)).data,
  updateProgress: async (id: string, completedSteps: number, version: number) => (await apiClient.patch<GrowthGoal>(`/growth/goals/${id}/progress`, { completedSteps, version })).data,
  archiveGoal: async (id: string) => { await apiClient.delete(`/growth/goals/${id}`); },
  acceptGoal: async (id: string) => (await apiClient.post<GrowthGoal>(`/growth/goals/${id}/accept`)).data,
  completeExercise: async (id: string) => { await apiClient.post(`/growth/exercises/${id}/complete`, {}); },
  checkIn: async (input: GrowthCheckInInput) => { await apiClient.post('/growth/check-ins', input); },
  enrollPath: async (pathKey: string) => { await apiClient.post('/growth/paths/enroll', { pathKey }); },
  updatePreferences: async (input: GrowthPreference) => (await apiClient.patch('/growth/preferences', input)).data,
};
