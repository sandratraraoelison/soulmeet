import { api, json } from './api';
import type { Coach, Profile } from '@/types';

export const profileService = {
  get: () => api<Profile>('/profile'),
  update: (input: Partial<Profile>) => api<Profile>('/profile', json('PUT', input)),
  completeOnboarding: () => api<Profile>('/profile/complete-onboarding', json('POST', {})),
};

export const coachService = {
  get: () => api<Coach>('/coach'),
  create: (input: unknown) => api<Coach>('/coach', json('POST', input)),
  update: (input: unknown) => api<Coach>('/coach', json('PUT', input)),
};
