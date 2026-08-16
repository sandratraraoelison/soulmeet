import { useEffect, useState } from 'react';
import { Alert, Linking, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Button } from '@/components/common/Button';
import { SettingsLinkRow } from '@/components/common/SettingsLinkRow';
import { Screen } from '@/components/common/Screen';
import { BackButton } from '@/components/navigation/BackButton';
import { defaultNotificationPreferences, notificationService, notificationsSupported, type NotificationPreferences } from '@/services/notification.service';
import { biometricService } from '@/services/biometric.service';
import { useThemeStore, type ThemeMode } from '@/store/theme.store';
export default function SettingsScreen() {
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(true);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(defaultNotificationPreferences);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(true);
  const theme = useThemeStore((state) => state.mode);
  const setTheme = useThemeStore((state) => state.setMode);
  useEffect(() => {
    void Promise.all([notificationService.status(), notificationService.preferences()])
      .then(([status, preferences]) => { setNotificationsEnabled(status.enabled); setNotificationPreferences(preferences); })
      .finally(() => setNotificationBusy(false));
  }, []);
  useEffect(() => {
    void Promise.all([biometricService.availability(), biometricService.enabled()])
      .then(([status, active]) => {
        setBiometricAvailable(status.available);
        setBiometricEnrolled(status.enrolled);
        setBiometricEnabled(active && status.available && status.enrolled);
      })
      .finally(() => setBiometricBusy(false));
  }, []);
  const toggleNotifications = async (value: boolean) => {
    setNotificationBusy(true);
    if (!value) { await notificationService.disable(); setNotificationsEnabled(false); }
    else {
      const granted = await notificationService.request();
      setNotificationsEnabled(granted);
      if (!granted) Alert.alert('Notifications are disabled', 'You can allow Soulmeet notifications from your device settings.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Open settings', onPress: () => void Linking.openSettings() }]);
    }
    setNotificationBusy(false);
  };
  const updateNotificationPreference = async <K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) => {
    const next = { ...notificationPreferences, [key]: value };
    setNotificationPreferences(next);
    await notificationService.savePreferences(next);
  };
  const formatHour = (hour: number) => `${String(hour).padStart(2, '0')}:00`;
  const toggleBiometrics = async (value: boolean) => {
    setBiometricBusy(true);
    if (!value) {
      await biometricService.disable();
      setBiometricEnabled(false);
    } else {
      const result = await biometricService.enable();
      setBiometricEnabled(result.success);
      if (!result.success) Alert.alert('Biometric lock unavailable', result.reason ?? 'Please configure biometrics in your device settings.');
    }
    setBiometricBusy(false);
  };
  const openUrl = async (url: string) => {
    try { await Linking.openURL(url); }
    catch { Alert.alert('Unable to open this page', 'Please try again later.'); }
  };
  const supportEmail = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'support@soulmeet.app';
  const helpUrl = process.env.EXPO_PUBLIC_HELP_URL ?? 'https://soulmeet.app/help';
  const termsUrl = process.env.EXPO_PUBLIC_TERMS_URL ?? 'https://soulmeet.app/terms';
  const privacyUrl = process.env.EXPO_PUBLIC_PRIVACY_URL ?? 'https://soulmeet.app/privacy';
  return (
    <Screen>
      <View className="flex-row items-center"><BackButton fallbackHref="/(app)/profile" /><Text className="ml-3 font-label text-xs font-bold tracking-[3px] text-secondary">SOULMEET</Text></View>
      <Text className="mt-5 font-headline text-3xl font-bold text-ink">Settings</Text>
      <Text className="mt-2 text-muted">Manage your Soulmeet session.</Text>
      <View className="mt-8 gap-4 rounded-[22px] border border-border bg-surface p-5">
        <View className="rounded-2xl border border-border bg-surface-raised p-4">
          <Text className="font-label font-bold text-ink">Appearance</Text>
          <Text className="mt-1 text-sm text-muted">Choose how Soulmeet looks on this device.</Text>
          <View className="mt-4 flex-row gap-3">{(['dark', 'light'] as ThemeMode[]).map((item) => <Button key={item} label={item === 'dark' ? 'Dark' : 'Light'} variant={theme === item ? 'primary' : 'secondary'} onPress={() => void setTheme(item)} />)}</View>
        </View>
        <View className="rounded-2xl border border-border bg-surface-raised p-4">
          <View className="flex-row items-center justify-between">
            <View className="mr-4 flex-1"><Text className="font-label font-bold text-ink">Notifications</Text><Text className="mt-1 text-sm leading-5 text-muted">{notificationsSupported ? 'Choose what Soulmeet may notify you about.' : 'Requires a development build on Android; unavailable in Expo Go.'}</Text></View>
            <Switch accessibilityLabel="Notifications" disabled={notificationBusy || !notificationsSupported} value={notificationsEnabled} onValueChange={(value) => void toggleNotifications(value)} trackColor={{ false: '#353640', true: '#6366F1' }} thumbColor={notificationsEnabled ? '#FFFFFF' : '#9494A3'} />
          </View>
          <View className={`mt-4 border-t border-border ${!notificationsEnabled ? 'opacity-50' : ''}`}>
            {([
              ['newMessages', 'New messages', 'Messages from your Soulmeet connections.'],
              ['coachReflections', 'Coach reflections', 'New thoughts and reflections from your coach.'],
              ['soulprintConfirmations', 'Soulprint suggestions to confirm', 'Insights that need your review.'],
              ['growthReminders', 'Growth reminders', 'Gentle reminders for goals and exercises.'],
            ] as const).map(([key, label, description]) => (
              <View key={key} className="flex-row items-center justify-between border-b border-border py-4">
                <View className="mr-4 flex-1"><Text className="font-label font-semibold text-ink">{label}</Text><Text className="mt-1 text-xs leading-5 text-muted">{description}</Text></View>
                <Switch accessibilityLabel={label} disabled={!notificationsEnabled || notificationBusy} value={notificationPreferences[key]} onValueChange={(value) => void updateNotificationPreference(key, value)} trackColor={{ false: '#353640', true: '#6366F1' }} thumbColor={notificationPreferences[key] ? '#FFFFFF' : '#9494A3'} />
              </View>
            ))}
            <View className="pt-4">
              <View className="flex-row items-center justify-between">
                <View className="mr-4 flex-1"><Text className="font-label font-semibold text-ink">Quiet hours</Text><Text className="mt-1 text-xs leading-5 text-muted">Pause all notifications during your rest time.</Text></View>
                <Switch accessibilityLabel="Quiet hours" disabled={!notificationsEnabled || notificationBusy} value={notificationPreferences.quietHoursEnabled} onValueChange={(value) => void updateNotificationPreference('quietHoursEnabled', value)} trackColor={{ false: '#353640', true: '#6366F1' }} thumbColor={notificationPreferences.quietHoursEnabled ? '#FFFFFF' : '#9494A3'} />
              </View>
              {notificationPreferences.quietHoursEnabled ? (
                <View className="mt-4 flex-row gap-3">
                  <View className="flex-1"><Button accessibilityHint="Tap to advance by one hour" label={`From ${formatHour(notificationPreferences.quietHoursStart)}`} variant="secondary" onPress={() => void updateNotificationPreference('quietHoursStart', (notificationPreferences.quietHoursStart + 1) % 24)} /></View>
                  <View className="flex-1"><Button accessibilityHint="Tap to advance by one hour" label={`Until ${formatHour(notificationPreferences.quietHoursEnd)}`} variant="secondary" onPress={() => void updateNotificationPreference('quietHoursEnd', (notificationPreferences.quietHoursEnd + 1) % 24)} /></View>
                </View>
              ) : null}
            </View>
          </View>
        </View>
        <View className="rounded-2xl border border-border bg-surface-raised p-4">
          <Text className="font-label font-bold text-ink">Security</Text>
          <Text className="mt-1 text-sm leading-5 text-muted">Protect access to your account and private information.</Text>
          <View className="mt-4 flex-row items-center justify-between border-t border-border pt-4">
            <View className="mr-4 flex-1">
              <Text className="font-label font-semibold text-ink">Biometric lock</Text>
              <Text className="mt-1 text-sm leading-5 text-muted">
                {!biometricAvailable ? 'Biometric authentication is unavailable on this device.' : !biometricEnrolled ? 'Set up biometrics in your device settings first.' : 'Require Face ID or fingerprint when reopening Soulmeet.'}
              </Text>
            </View>
            <Switch accessibilityLabel="Biometric lock" disabled={biometricBusy || !biometricAvailable || !biometricEnrolled} value={biometricEnabled} onValueChange={(value) => void toggleBiometrics(value)} trackColor={{ false: '#353640', true: '#6366F1' }} thumbColor={biometricEnabled ? '#FFFFFF' : '#9494A3'} />
          </View>
          <View className="mt-4"><Button label="Change password" variant="secondary" onPress={() => router.push('/(app)/change-password')} /></View>
        </View>
      </View>
      <View className="mt-6 rounded-[22px] border border-border bg-surface p-5">
        <Text className="font-headline text-lg font-bold text-ink">Support</Text>
        <Text className="mt-1 text-sm leading-5 text-muted">Get help, share feedback, or review important information.</Text>
        <View className="mt-3">
          <SettingsLinkRow label="Help center" description="Find answers and learn how Soulmeet works." onPress={() => void openUrl(helpUrl)} />
          <SettingsLinkRow label="Contact us" description="Talk directly with the Soulmeet support team." onPress={() => void openUrl(`mailto:${supportEmail}?subject=Soulmeet%20support%20-%20v${version}`)} />
          <SettingsLinkRow label="Report a problem" description="Tell us what happened so we can investigate." onPress={() => void openUrl(`mailto:${supportEmail}?subject=Soulmeet%20problem%20report%20-%20v${version}&body=Please%20describe%20the%20problem%20and%20the%20steps%20to%20reproduce%20it%3A%0A%0A`)} />
          <SettingsLinkRow label="Terms of use" onPress={() => void openUrl(termsUrl)} />
          <SettingsLinkRow label="Privacy policy" onPress={() => void openUrl(privacyUrl)} />
          <SettingsLinkRow label="App version" value={version} showChevron={false} />
        </View>
      </View>
    </Screen>
  );
}
