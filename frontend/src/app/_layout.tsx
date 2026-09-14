import '../global.css';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { View } from 'react-native';
import { vars } from 'nativewind';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { coachApi } from '@/api/coach.api';
import { authApi } from '@/api/auth.api';
import { profileApi } from '@/api/profile.api';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { useChatSocketLifecycle } from '@/features/chat/hooks/use-chat';
import { useNotifications } from '@/hooks/use-notifications';
import { useSessionRestore } from '@/hooks/use-session-restore';
import { diag } from '@/lib/diag';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/store/auth.store';
import { NotificationPermissionPrompt } from '@/components/notifications/NotificationPermissionPrompt';
import { useThemePalette, useThemeStore } from '@/store/theme.store';
import { SoulprintConsentPrompt } from '@/features/consent/consent';
import { ToastViewport } from '@/components/notifications/ToastViewport';

function Navigation() {
  const { isAuthenticated, isRestoring } = useAuthStore();
  const { colors } = useThemePalette();
  const [accountLoadTimedOut, setAccountLoadTimedOut] = useState(false);
  useChatSocketLifecycle(isAuthenticated);
  useNotifications(isAuthenticated);
  useSessionRestore();
  const me = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
    enabled: isAuthenticated,
    retry: false,
  });
  const complete = Boolean(
    me.data?.onboardingCompleted && me.data?.hasCoach,
  );
  const profile = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.get,
    enabled: isAuthenticated && complete,
    retry: false,
  });
  const coach = useQuery({
    queryKey: ['coach'],
    queryFn: coachApi.get,
    enabled: isAuthenticated && complete,
    retry: false,
  });
  const hasPendingAccountRequest = me.isPending;
  useEffect(() => {
    setAccountLoadTimedOut(false);
    if (!isAuthenticated || !hasPendingAccountRequest) return;

    // The account bootstrap must never keep a new OAuth user behind the
    // splash indefinitely. Both API calls have their own request timeout;
    // this is a final guard for a stalled native/network request.
    const timer = setTimeout(() => setAccountLoadTimedOut(true), 15_000);
    return () => clearTimeout(timer);
  }, [isAuthenticated, hasPendingAccountRequest]);

  const isLoadingAccount =
    isAuthenticated && hasPendingAccountRequest && !accountLoadTimedOut;

  const showLoading = isRestoring || isLoadingAccount;
  useEffect(() => {
    diag.log('NAV-render', JSON.stringify({
      isRestoring,
      isAuthenticated,
      profileStatus: profile.status,
      profileError: profile.isError,
      coachStatus: coach.status,
      coachError: coach.isError,
      isLoadingAccount,
      showLoading,
      complete,
    }));
  }, [isRestoring, isAuthenticated, profile.status, profile.isError, coach.status, coach.isError, isLoadingAccount, showLoading, complete]);

  useEffect(() => {
    if (!showLoading) return;
    const timer = setTimeout(() => {
      diag.error('STUCK-on-LoadingScreen-8s', JSON.stringify({
        isRestoring,
        isAuthenticated,
        profile: {
          status: profile.status,
          isFetching: profile.isFetching,
          error: profile.error ? String(profile.error) : null,
        },
        coach: {
          status: coach.status,
          isFetching: coach.isFetching,
          error: coach.error ? String(coach.error) : null,
        },
        meCached: Boolean(queryClient.getQueryData(['me'])),
        profileCached: Boolean(queryClient.getQueryData(['profile'])),
        coachCached: Boolean(queryClient.getQueryData(['coach'])),
      }));
    }, 8000);
    return () => clearTimeout(timer);
  }, [showLoading, isRestoring, isAuthenticated, profile.status, profile.isFetching, profile.error, coach.status, coach.isFetching, coach.error]);

  if (isRestoring || isLoadingAccount) return <LoadingScreen />;
  return (
    <>
    <NotificationPermissionPrompt enabled={isAuthenticated && complete} />
    <SoulprintConsentPrompt enabled={isAuthenticated && complete} />
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(public)" />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated && !complete}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated && complete}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
    </>
  );
}
export default function RootLayout() {
  const [client] = useState(() => queryClient);
  const { mode, colors, vars: themeVars } = useThemePalette();
  const hydrateTheme = useThemeStore((state) => state.hydrate);
  const canvas = colors.canvas;
  useEffect(() => {
    void hydrateTheme();
  }, [hydrateTheme]);
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(canvas);
  }, [canvas]);
  return (
    <KeyboardProvider preload={false}>
      <QueryClientProvider client={client}>
        <View className="flex-1 bg-canvas" style={vars(themeVars)}>
          <StatusBar style={mode === 'light' ? 'dark' : 'light'} backgroundColor={canvas} />
          <Navigation />
          <ToastViewport />
        </View>
      </QueryClientProvider>
    </KeyboardProvider>
  );
}
