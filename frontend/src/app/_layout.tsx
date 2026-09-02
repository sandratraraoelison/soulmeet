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
import { profileApi } from '@/api/profile.api';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { useChatSocketLifecycle } from '@/features/chat/hooks/use-chat';
import { useNotifications } from '@/hooks/use-notifications';
import { useSessionRestore } from '@/hooks/use-session-restore';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/store/auth.store';
import { NotificationPermissionPrompt } from '@/components/notifications/NotificationPermissionPrompt';
import { useThemePalette, useThemeStore } from '@/store/theme.store';
import { SoulprintConsentPrompt } from '@/features/consent/consent';

function Navigation() {
  const { isAuthenticated, isRestoring } = useAuthStore();
  const { colors } = useThemePalette();
  useChatSocketLifecycle(isAuthenticated);
  useNotifications(isAuthenticated);
  useSessionRestore();
  const profile = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.get,
    enabled: isAuthenticated,
    retry: false,
  });
  const coach = useQuery({
    queryKey: ['coach'],
    queryFn: coachApi.get,
    enabled: isAuthenticated,
    retry: false,
  });
  const isLoadingAccount =
    isAuthenticated &&
    ((profile.isPending && !profile.isError) || coach.isPending);
  if (isRestoring || isLoadingAccount) return <LoadingScreen />;
  const complete = Boolean(profile.data?.onboardingCompleted && coach.data);
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
        </View>
      </QueryClientProvider>
    </KeyboardProvider>
  );
}
