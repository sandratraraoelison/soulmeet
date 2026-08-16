import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'soulmeet.biometricLockEnabled';
const webMemory = new Map<string, string>();
const get = () => Platform.OS === 'web' ? Promise.resolve(webMemory.get(KEY) ?? null) : SecureStore.getItemAsync(KEY);
const set = (value: string) => Platform.OS === 'web' ? Promise.resolve(void webMemory.set(KEY, value)) : SecureStore.setItemAsync(KEY, value);

export const biometricService = {
  async availability() {
    if (Platform.OS === 'web') return { available: false, enrolled: false };
    try {
      const [available, enrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
      return { available, enrolled };
    } catch {
      return { available: false, enrolled: false };
    }
  },
  async enabled() { return (await get()) === 'true'; },
  async enable() {
    const status = await this.availability();
    if (!status.available || !status.enrolled) return { success: false, reason: 'Biometrics are not configured on this device.' };
    const result = await this.authenticate('Confirm biometric lock');
    if (result.success) await set('true');
    return result;
  },
  async disable() { await set('false'); },
  async authenticate(promptMessage = 'Unlock Soulmeet') {
    if (Platform.OS === 'web') return { success: false, reason: 'Biometric authentication is unavailable on web.' };
    try {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage, promptSubtitle: 'Protect your private conversations and Soulprint', cancelLabel: 'Cancel', fallbackLabel: 'Use device passcode', biometricsSecurityLevel: 'strong' });
      return result.success ? { success: true as const } : { success: false as const, reason: result.error };
    } catch {
      return { success: false as const, reason: 'Biometric authentication is unavailable.' };
    }
  },
};
