import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { diag } from '@/lib/diag';
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
    diag.log('tokenStorage.save() start access=', Boolean(tokens.accessToken), 'refresh=', Boolean(tokens.refreshToken));
    await Promise.all([
      storage.set(ACCESS_KEY, tokens.accessToken),
      storage.set(REFRESH_KEY, tokens.refreshToken),
    ]);
    diag.log('tokenStorage.save() resolved');
  },
  async get() {
    const [accessToken, refreshToken] = await Promise.all([
      storage.get(ACCESS_KEY),
      storage.get(REFRESH_KEY),
    ]);
    diag.log('tokenStorage.get() access=', Boolean(accessToken), 'refresh=', Boolean(refreshToken));
    return { accessToken, refreshToken };
  },
  async clear() {
    diag.log('tokenStorage.clear() start');
    await Promise.all([
      storage.remove(ACCESS_KEY),
      storage.remove(REFRESH_KEY),
    ]);
    diag.log('tokenStorage.clear() resolved');
  },
};
