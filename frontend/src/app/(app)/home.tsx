import { useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { Text, View } from 'react-native';
import { coachApi } from '@/api/coach.api';
import { profileApi } from '@/api/profile.api';
import { Button } from '@/components/common/Button';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { Screen } from '@/components/common/Screen';
import { AccountButton } from '@/components/navigation/AccountButton';
import { CoachIdentityCard } from '@/features/guidance/components/CoachIdentityCard';
import { guidanceApi } from '@/features/guidance/api/guidance.api';
import { useCreateGuidanceConversation } from '@/features/guidance/hooks/use-guidance';
import { MotionPressable } from '@/components/motion/MotionPressable';

export default function GuidanceHomeScreen() {
  const profile = useQuery({ queryKey: ['profile'], queryFn: profileApi.get });
  const coach = useQuery({ queryKey: ['coach'], queryFn: coachApi.get });
  const suggestion = useQuery({ queryKey: ['guidance', 'home-suggestion'], queryFn: guidanceApi.getHomeSuggestion });
  const create = useCreateGuidanceConversation();

  if (!profile.data || !coach.data) return <LoadingScreen />;
  const open = (id: string) => router.push(`/(app)/guidance/${id}` as Href);
  const createAndOpen = async () => {
    const conversation = await create.mutateAsync({ title: `Conversation with ${coach.data.name}` });
    open(conversation.id);
  };

  return (
    <Screen>
      <View className="pb-6 pt-2">
        <View className="flex-row items-center justify-between"><Text className="font-label text-xs font-bold tracking-[3px] text-secondary">GUIDANCE</Text><AccountButton /></View>
        <Text className="mt-3 font-headline text-4xl font-bold text-ink">Hello, {profile.data.firstName}</Text>
        <Text className="mb-6 mt-2 font-body text-base text-muted">A space to think, feel, and move forward.</Text>
        <CoachIdentityCard coach={coach.data} onPress={() => router.push('/(app)/coach-profile')} />
        <View className="mt-5 rounded-[24px] border border-border bg-surface p-5">
          <Text className="font-label text-xs font-bold uppercase tracking-[2px] text-secondary">{coach.data.name}</Text>
          <Text className="mt-3 font-body text-base leading-7 text-ink">
            {suggestion.data?.message ?? `Hey ${profile.data.firstName}, how are you doing today? Tell me one interesting thing about you or your dating life.`}
          </Text>
          <View className="mt-5">
            <Button label={`Talk to ${coach.data.name}`} loading={create.isPending} onPress={() => void createAndOpen()} />
          </View>
          <MotionPressable accessibilityRole="link" accessibilityLabel="Open Coach archive" onPress={() => router.push('/(app)/guidance-history')} className="mt-4 self-start py-2">
            <Text className="text-xs font-semibold text-muted">Look back at everything you and your coach talked about  →</Text>
          </MotionPressable>
        </View>
      </View>
    </Screen>
  );
}
