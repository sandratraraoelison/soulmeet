import { apiClient } from './client';
import type { Gender, Tokens, User } from '@/types/models';
export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  birthDate: string;
  gender: Gender;
  country: string;
  location: string;
  occupation?: string;
}
export interface LoginInput {
  email: string;
  password: string;
}
export const authApi = {
  register: async (input: RegisterInput) =>
    (await apiClient.post<Tokens>('/auth/register', input)).data,
  login: async (input: LoginInput) =>
    (await apiClient.post<Tokens>('/auth/login', input)).data,
  google: async (identityToken: string) =>
    (await apiClient.post<Tokens>('/auth/google', { identityToken })).data,
  apple: async (identityToken: string) =>
    (await apiClient.post<Tokens>('/auth/apple', { identityToken })).data,
  me: async () => (await apiClient.get<User>('/auth/me')).data,
  logout: async (refreshToken: string) =>
    (await apiClient.post('/auth/logout', { refreshToken })).data,
  changePassword: async (input: { currentPassword: string; newPassword: string }) =>
    (await apiClient.post<{ message: string }>('/auth/change-password', input)).data,
  forgotPassword: async (email: string) =>
    (await apiClient.post<{ message: string }>('/auth/forgot-password', { email })).data,
  resetPassword: async (input: { email: string; code: string; newPassword: string }) =>
    (await apiClient.post<{ message: string }>('/auth/reset-password', input)).data,
  // TODO: Add verified Google and Apple authorization-code flows when backend endpoints are available.
};
