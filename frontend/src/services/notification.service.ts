import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { notificationsApi } from '@/api/notifications.api';

const ENABLED_KEY = 'soulmeet.messageNotificationsEnabled';
const ASKED_KEY = 'soulmeet.messageNotificationsAsked';
const PREFERENCES_KEY = 'soulmeet.notificationPreferences';
const PUSH_TOKEN_KEY = 'soulmeet.expoPushToken';
const memory = new Map<string, string>();
const storage = {
  get: (key: string) => Platform.OS === 'web' ? Promise.resolve(memory.get(key) ?? null) : SecureStore.getItemAsync(key),
  set: (key: string, value: string) => Platform.OS === 'web' ? Promise.resolve(void memory.set(key, value)) : SecureStore.setItemAsync(key, value),
};

export const notificationsSupported = Platform.OS !== 'web' && !(Platform.OS === 'android' && Constants.appOwnership === 'expo');

async function notifications() {
  if (!notificationsSupported) return null;
  const loaded = await import('expo-notifications');
  return typeof loaded.setNotificationHandler === 'function' ? loaded : loaded.default;
}

export interface NotificationPreferences {
  newMessages: boolean;
  coachReflections: boolean;
  soulprintConfirmations: boolean;
  growthReminders: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
}

export const defaultNotificationPreferences: NotificationPreferences = {
  newMessages: true,
  coachReflections: true,
  soulprintConfirmations: true,
  growthReminders: false,
  quietHoursEnabled: false,
  quietHoursStart: 22,
  quietHoursEnd: 8,
};

const isQuietTime = (preferences: NotificationPreferences, hour = new Date().getHours()) => {
  if (!preferences.quietHoursEnabled || preferences.quietHoursStart === preferences.quietHoursEnd) return false;
  return preferences.quietHoursStart < preferences.quietHoursEnd
    ? hour >= preferences.quietHoursStart && hour < preferences.quietHoursEnd
    : hour >= preferences.quietHoursStart || hour < preferences.quietHoursEnd;
};

export const notificationService = {
  async configure() {
    const api = await notifications();
    if (!api) return;
    api.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }) });
    if (Platform.OS === 'android') await api.setNotificationChannelAsync('messages', { name: 'New messages', description: 'Messages from your Soulmeet connections', importance: api.AndroidImportance.HIGH, vibrationPattern: [0, 180], lightColor: '#D4AF37' });
  },
  async status() {
    const [enabled, asked] = await Promise.all([storage.get(ENABLED_KEY), storage.get(ASKED_KEY)]);
    const api = await notifications();
    const permission = api ? await api.getPermissionsAsync() : null;
    return { enabled: enabled === 'true' && Boolean(permission?.granted), asked: asked === 'true', granted: Boolean(permission?.granted), supported: notificationsSupported };
  },
  async request() {
    await storage.set(ASKED_KEY, 'true');
    const api = await notifications();
    if (!api) { await storage.set(ENABLED_KEY, 'false'); return false; }
    if (Platform.OS === 'android') await this.configure();
    const result = await api.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
    await storage.set(ENABLED_KEY, String(result.granted));
    if (result.granted) await this.registerDevice();
    return result.granted;
  },
  async decline() { await Promise.all([storage.set(ASKED_KEY, 'true'), storage.set(ENABLED_KEY, 'false')]); },
  async disable() {
    await storage.set(ENABLED_KEY, 'false');
    const token = await storage.get(PUSH_TOKEN_KEY);
    if (token && (Platform.OS === 'android' || Platform.OS === 'ios')) {
      try { await notificationsApi.disableDevice(token, Platform.OS); } catch { /* Retry registration state on next authenticated launch. */ }
    }
  },
  async preferences(): Promise<NotificationPreferences> {
    const raw = await storage.get(PREFERENCES_KEY);
    if (!raw) return defaultNotificationPreferences;
    try { return { ...defaultNotificationPreferences, ...JSON.parse(raw) as Partial<NotificationPreferences> }; }
    catch { return defaultNotificationPreferences; }
  },
  async savePreferences(preferences: NotificationPreferences) {
    await storage.set(PREFERENCES_KEY, JSON.stringify(preferences));
    try { await notificationsApi.updatePreferences({ ...preferences, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' }); } catch { /* Local preferences remain authoritative while offline. */ }
  },
  async registerDevice() {
    const api = await notifications();
    if (!api || (Platform.OS !== 'android' && Platform.OS !== 'ios')) return null;
    const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return null;
    try {
      const token = (await api.getExpoPushTokenAsync({ projectId })).data;
      await notificationsApi.registerDevice(token, Platform.OS);
      await storage.set(PUSH_TOKEN_KEY, token);
      return token;
    } catch { return null; }
  },
  async syncWithServer() {
    if (!(await this.status()).enabled) return;
    try {
      const server = await notificationsApi.preferences();
      const preferences: NotificationPreferences = { ...defaultNotificationPreferences, ...server };
      await storage.set(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch { /* Keep cached preferences while offline. */ }
    await this.registerDevice();
  },
  async canNotify(category: keyof Pick<NotificationPreferences, 'newMessages' | 'coachReflections' | 'soulprintConfirmations' | 'growthReminders'>) {
    if (!(await this.status()).enabled) return false;
    const preferences = await this.preferences();
    return preferences[category] && !isQuietTime(preferences);
  },
  async showMessage(input: { senderName: string; body: string; conversationId: string }) {
    if (!(await this.canNotify('newMessages'))) return;
    const api = await notifications();
    if (!api) return;
    await api.scheduleNotificationAsync({ content: { title: `New message from ${input.senderName}`, body: input.body.slice(0, 140), sound: 'default', data: { conversationId: input.conversationId } }, trigger: null });
  },
};
