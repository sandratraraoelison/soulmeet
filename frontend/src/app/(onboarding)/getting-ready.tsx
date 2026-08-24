import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ThemedStatusBar } from '@/components/common/ThemedStatusBar';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { profileApi } from '@/api/profile.api';
import { useOnboardingStore } from '@/store/onboarding.store';
import { soulApi } from '@/features/soul/api/soul.api';

export default function GettingReadyScreen() {
  const queryClient = useQueryClient();
  const reset = useOnboardingStore((state) => state.reset);
  const matchingConsent = useOnboardingStore((state) => state.matchingConsent);
  useEffect(() => {
    const timer = setTimeout(() => {
      void profileApi.complete().then(async (profile) => {
        if (matchingConsent) await soulApi.activate();
        queryClient.setQueryData(['profile'], profile);
        reset();
        await queryClient.invalidateQueries({ queryKey: ['me'] });
      });
    }, 1800);
    return () => clearTimeout(timer);
  }, [matchingConsent, queryClient, reset]);
  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <ThemedStatusBar />
      <View className="flex-1 items-center justify-center px-8">
        <View className="h-24 w-24 items-center justify-center rounded-full border border-[#F7C94B]/40 bg-[#191821]">
          <ActivityIndicator size="large" color="#F7C94B" />
        </View>
        <Text className="mt-9 text-center text-[30px] font-bold text-ink">
          Your coach is{`\n`}
          <Text className="text-[#F7C94B]">getting ready.</Text>
        </Text>
        <Text className="mt-4 text-center text-base leading-6 text-muted">
          We are shaping a unique presence around your choices.
        </Text>
      </View>
    </SafeAreaView>
  );
}
