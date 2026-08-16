import { apiClient } from './client';
import type { NotificationPreferences } from '@/services/notification.service';

export const notificationsApi = {
  preferences: async () => (await apiClient.get<NotificationPreferences & { timezone: string }>('/notifications/preferences')).data,
  updatePreferences: async (preferences: NotificationPreferences & { timezone: string }) => (await apiClient.patch('/notifications/preferences', preferences)).data,
  registerDevice: async (token: string, platform: 'android' | 'ios') => (await apiClient.post('/notifications/devices', { token, platform })).data,
  disableDevice: async (token: string, platform: 'android' | 'ios') => (await apiClient.delete('/notifications/devices', { data: { token, platform } })).data,
};
