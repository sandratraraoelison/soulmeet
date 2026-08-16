import { router, type Href } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ThemedStatusBar } from '@/components/common/ThemedStatusBar';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { coachApi } from '@/api/coach.api';
import { getErrorMessage } from '@/api/client';
import { Button } from '@/components/common/Button';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { BackButton } from '@/components/navigation/BackButton';
import { useOnboardingStore } from '@/store/onboarding.store';
import type { CoachPersonality } from '@/types/models';

const traits: {
  value: CoachPersonality;
  label: string;
  description: string;
}[] = [
  {
    value: 'FRIENDLY',
    label: 'Friendly',
    description: 'Warm, casual, and easy to talk to.',
  },
  {
    value: 'BRO_VIBE',
    label: 'Bro vibe',
    description: 'Relaxed, loyal, and straight-talking.',
  },
  {
    value: 'SISTER_VIBE',
    label: 'Sister vibe',
    description: 'Supportive, honest, and caring.',
  },
  {
    value: 'THERAPIST',
    label: 'Therapist-like',
    description: 'Reflective listening and thoughtful questions.',
  },
  {
    value: 'DATING_EXPERT',
    label: 'Confident dating expert',
    description: 'Clear confidence for modern dating.',
  },
  {
    value: 'FUNNY',
    label: 'Funny',
    description: 'Humor and wit when things feel heavy.',
  },
  {
    value: 'SERIOUS',
    label: 'Serious',
    description: 'Focused, composed, and intentional.',
  },
  {
    value: 'EMPATHETIC',
    label: 'Empathetic',
    description: 'Sensitive to feelings and emotional nuance.',
  },
  {
    value: 'SARCASTIC',
    label: 'Sarcastic',
    description: 'Playful edge with clever honesty.',
  },
  {
    value: 'DIRECT',
    label: 'Direct',
    description: 'Clear feedback without detours.',
  },
  {
    value: 'SOFT',
    label: 'Soft',
    description: 'Gentle, patient, and reassuring.',
  },
  {
    value: 'MORE_DIRECTIVE',
    label: 'More directive',
    description: 'Proactive advice and concrete next steps.',
  },
  {
    value: 'LESS_DIRECTIVE',
    label: 'Less directive',
    description: 'More space to reflect and decide yourself.',
  },
];

export default function PersonalityScreen() {
  const queryClient = useQueryClient();
  const gender = useOnboardingStore((state) => state.coachGender);
  const appearance = useOnboardingStore((state) => state.coachAppearance);
  const name = useOnboardingStore((state) => state.coachName);
  const selected = useOnboardingStore((state) => state.coachTraits);
  const toggle = useOnboardingStore((state) => state.toggleCoachTrait);
  const create = useMutation({
    mutationFn: () =>
      coachApi.create({ name: name.trim(), gender: gender!, traits: selected, appearance: appearance ?? undefined }),
    onSuccess: (coach) => {
      queryClient.setQueryData(['coach'], coach);
      router.replace('/(onboarding)/getting-ready' as Href);
    },
  });
  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <ThemedStatusBar />
      <ScrollView
        contentContainerClassName="px-5 pb-8"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center border-b border-white/5 py-3">
          <BackButton />
          <Text className="text-sm text-muted">Soulmeet</Text>
        </View>
        <View className="mt-7 flex-row justify-between">
          <Text className="text-xs font-bold tracking-wider text-[#AFA9E8]">
            STEP 3 OF 3
          </Text>
          <Text className="text-xs text-muted">Coach personality</Text>
        </View>
        <View className="mt-4 h-[3px] rounded-full bg-surface-raised">
          <View className="h-[3px] w-full rounded-full bg-[#F7C94B]" />
        </View>
        <Text className="mt-8 text-center text-[30px] font-bold text-ink">
          Shape their <Text className="text-[#F7C94B]">personality</Text>
        </Text>
        <Text className="mx-3 mb-8 mt-3 text-center text-base leading-6 text-muted">
          Choose as many traits as you like. They can be combined and refined
          later.
        </Text>
        <View className="gap-3">
          {traits.map((trait) => {
            const active = selected.includes(trait.value);
            return (
              <Pressable
                key={trait.value}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                onPress={() => toggle(trait.value)}
                className={`flex-row items-center rounded-xl border px-4 py-4 ${active ? 'border-primary bg-primary/10' : 'border-border bg-surface'}`}
              >
                <View className="flex-1">
                  <Text className="text-base font-bold text-ink">
                    {trait.label}
                  </Text>
                  <Text className="mt-1 text-sm leading-5 text-[#7E7989]">
                    {trait.description}
                  </Text>
                </View>
                <View
                  className={`ml-3 h-6 w-6 items-center justify-center rounded-md border-2 ${active ? 'border-[#F7C94B] bg-[#F7C94B]' : 'border-border'}`}
                >
                  {active ? (
                    <Text className="font-bold text-[#171621]">✓</Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
        <ErrorMessage
          message={create.error ? getErrorMessage(create.error) : null}
        />
        <View className="mt-8">
          <Button
            label="Create my coach"
            variant="light"
            disabled={!selected.length || !gender || !name.trim()}
            loading={create.isPending}
            onPress={() => create.mutate()}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
