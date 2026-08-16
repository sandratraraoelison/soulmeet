import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Tokens } from '@/types/models';

const ACCESS_KEY = 'soulmeet.accessToken';
const REFRESH_KEY = 'soulmeet.refreshToken';
const webMemory = new Map<string, string>();
const storage = {
  get: (key: string) =>
    Platform.OS === 'web'
      ? Promise.resolve(webMemory.get(key) ?? null)
      : SecureStore.getItemAsync(key),
  set: (key: string, value: string) =>
    Platform.OS === 'web'
      ? Promise.resolve(void webMemory.set(key, value))
      : SecureStore.setItemAsync(key, value),
  remove: (key: string) =>
    Platform.OS === 'web'
      ? Promise.resolve(void webMemory.delete(key))
      : SecureStore.deleteItemAsync(key),
};
export const tokenStorage = {
  async save(tokens: Tokens) {
    await Promise.all([
      storage.set(ACCESS_KEY, tokens.accessToken),
      storage.set(REFRESH_KEY, tokens.refreshToken),
    ]);
  },
  async get() {
    const [accessToken, refreshToken] = await Promise.all([
      storage.get(ACCESS_KEY),
      storage.get(REFRESH_KEY),
    ]);
    return { accessToken, refreshToken };
  },
  async clear() {
    await Promise.all([
      storage.remove(ACCESS_KEY),
      storage.remove(REFRESH_KEY),
    ]);
  },
};
