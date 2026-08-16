import { apiClient } from './client';
import type { Profile, ProfileInput } from '@/types/models';
export const profileApi = {
  get: async () => (await apiClient.get<Profile>('/profile')).data,
  save: async (input: Partial<ProfileInput>) =>
    (await apiClient.put<Profile>('/profile', input)).data,
  complete: async () =>
    (await apiClient.post<Profile>('/profile/complete-onboarding')).data,
};
