import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ThemedStatusBar } from '@/components/common/ThemedStatusBar';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/common/Button';
import { getErrorMessage } from '@/api/client';
import { profileApi } from '@/api/profile.api';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { BackButton } from '@/components/navigation/BackButton';
import { useLogout } from '@/hooks/use-auth';
import { useOnboardingStore } from '@/store/onboarding.store';
import type { InterestGender } from '@/types/models';

const options: {
  gender: InterestGender;
  symbol: string;
  title: string;
  available: boolean;
}[] = [
  {
    gender: 'MALE',
    symbol: '♂',
    title: 'Men',
    available: true,
  },
  {
    gender: 'FEMALE',
    symbol: '♀',
    title: 'Women',
    available: true,
  },
  {
    gender: 'NON_GENDERED',
    symbol: '☼',
    title: 'Any',
    available: true,
  },
];
export default function CompanionScreen() {
  const queryClient = useQueryClient();
  const gender = useOnboardingStore((state) => state.interestedInGender);
  const setGender = useOnboardingStore((state) => state.setInterestedInGender);
  const resetSelection = useOnboardingStore((state) => state.reset);
  const logout = useLogout();
  const saveInterest = useMutation({
    mutationFn: () => profileApi.save({ interestedInGender: gender! }),
    onSuccess: (profile) => {
      queryClient.setQueryData(['profile'], profile);
      router.push('/(onboarding)/tone');
    },
  });
  const restart = () => {
    resetSelection();
    logout.mutate();
  };
  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <ThemedStatusBar />
      <ScrollView
        contentContainerClassName="px-5 pb-8"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between border-b border-white/5 py-3">
          <View className="flex-row items-center gap-3">
            <BackButton accessibilityLabel="Back to profile" onPress={() => router.push('/(onboarding)/profile')} />
            <Text className="text-sm text-muted">Soulmeet</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={restart}
            disabled={logout.isPending}
            className="rounded-full border border-white/10 px-4 py-2"
          >
            <Text className="text-xs font-semibold text-[#F7C94B]">
              {logout.isPending ? 'Resetting...' : 'Restart test'}
            </Text>
          </Pressable>
        </View>
        <View className="mt-7">
          <Text className="text-xs font-bold tracking-wider text-[#AFA9E8]">
            YOUR DATING PREFERENCE
          </Text>
        </View>
        <Text className="mt-8 text-center text-[30px] font-bold leading-9 tracking-[-1px] text-ink">
          Who are you{`\n`}
          <Text className="text-[#F7C94B]">interested in?</Text>
        </Text>
        <Text className="mx-2 mb-7 mt-3 text-center text-base leading-6 text-muted">
          Choose the gender you are interested in. This helps Soulmeet
          understand your dating journey.
        </Text>
        <View className="gap-4">
          {options.map((option) => {
            const selected = option.gender === gender;
            return (
              <Pressable
                key={option.gender}
                accessibilityRole="radio"
                accessibilityState={{
                  checked: selected,
                  disabled: !option.available,
                }}
                disabled={!option.available}
                onPress={() => option.available && setGender(option.gender)}
                className={`min-h-[170px] items-center justify-center rounded-xl border px-7 py-6 ${selected ? 'border-primary bg-primary/10' : 'border-border bg-surface'} ${!option.available ? 'opacity-50' : 'active:opacity-80'}`}
              >
                <View
                  className={`h-14 w-14 items-center justify-center rounded-full ${selected ? 'bg-[#F7C94B]' : 'bg-surface-raised'}`}
                >
                  <Text
                    className={`text-3xl ${selected ? 'text-[#171621]' : 'text-muted'}`}
                  >
                    {option.symbol}
                  </Text>
                </View>
                <Text className="mt-5 text-xl font-bold text-ink">
                  {option.title}
                </Text>
                <View
                  className={`mt-5 h-5 w-5 items-center justify-center rounded-full border-2 ${selected ? 'border-[#F7C94B]' : 'border-border'}`}
                >
                  {selected ? (
                    <View className="h-2.5 w-2.5 rounded-full bg-[#F7C94B]" />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
        <View className="mt-7">
          <Button
            label="Continue"
            variant="light"
            disabled={!gender}
            loading={saveInterest.isPending}
            onPress={() => saveInterest.mutate()}
          />
          <ErrorMessage
            message={
              saveInterest.error ? getErrorMessage(saveInterest.error) : null
            }
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
