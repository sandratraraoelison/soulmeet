import { useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';
import { coachApi } from '@/api/coach.api';
import { profileApi } from '@/api/profile.api';
import { Button } from '@/components/common/Button';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { Screen } from '@/components/common/Screen';
import { AccountButton } from '@/components/navigation/AccountButton';
import { CoachIdentityCard } from '@/features/guidance/components/CoachIdentityCard';
import { GuidanceConversationCard } from '@/features/guidance/components/GuidanceConversationCard';
import { GuidanceSuggestionCard } from '@/features/guidance/components/GuidanceSuggestionCard';
import { GUIDANCE_SUGGESTIONS } from '@/features/guidance/constants/guidance.constants';
import { useCreateGuidanceConversation, useGuidanceConversations } from '@/features/guidance/hooks/use-guidance';
import { useGuidanceStore } from '@/features/guidance/store/guidance.store';
import type { GuidanceSuggestion } from '@/features/guidance/types/guidance.types';

export default function GuidanceHomeScreen() {
  const profile = useQuery({ queryKey: ['profile'], queryFn: profileApi.get });
  const coach = useQuery({ queryKey: ['coach'], queryFn: coachApi.get });
  const conversations = useGuidanceConversations();
  const create = useCreateGuidanceConversation();
  const setMode = useGuidanceStore((state) => state.setMode);
  const setDraft = useGuidanceStore((state) => state.setDraft);

  if (!profile.data || !coach.data) return <LoadingScreen />;
  const recent = conversations.data?.pages.flatMap((page) => page.conversations).slice(0, 3) ?? [];
  const open = (id: string) => router.push(`/(app)/guidance/${id}` as Href);
  const createAndOpen = async (suggestion?: GuidanceSuggestion) => {
    const conversation = await create.mutateAsync({ title: suggestion?.title, mode: suggestion?.mode });
    if (suggestion) {
      setMode(suggestion.mode);
      await setDraft(conversation.id, suggestion.starter);
    }
    open(conversation.id);
  };

  return (
    <Screen>
      <View className="pb-6 pt-2">
        <View className="flex-row items-center justify-between"><Text className="font-label text-xs font-bold tracking-[3px] text-secondary">GUIDANCE</Text><AccountButton /></View>
        <Text className="mt-3 font-headline text-4xl font-bold text-ink">Hello, {profile.data.firstName}</Text>
        <Text className="mb-6 mt-2 font-body text-base text-muted">A space to think, feel, and move forward.</Text>
        <CoachIdentityCard coach={coach.data} onPress={() => router.push('/(app)/coach-profile')} />
        <View className="mt-4"><Button label="Start a new conversation" loading={create.isPending} onPress={() => void createAndOpen()} /></View>
        <Text className="mb-3 mt-8 font-label text-xs font-bold uppercase tracking-[2px] text-muted">What would help today?</Text>
        <FlatList horizontal data={GUIDANCE_SUGGESTIONS} keyExtractor={(item) => item.id} renderItem={({ item }) => <GuidanceSuggestionCard suggestion={item} onPress={() => void createAndOpen(item)} />} showsHorizontalScrollIndicator={false} />
        <View className="mt-8 flex-row items-center justify-between">
          <Text className="font-headline text-xl font-bold text-ink">Recent conversations</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/(app)/guidance-history')}><Text className="font-label text-sm font-bold text-primary">View all</Text></Pressable>
        </View>
        {conversations.isError ? <View className="mt-4"><ErrorMessage message="Unable to load your conversations." /></View> : null}
        <View className="mt-4">
          {recent.length ? recent.map((item) => <GuidanceConversationCard key={item.id} conversation={item} onPress={() => open(item.id)} />) : !conversations.isLoading ? <Text className="rounded-[20px] border border-border bg-surface p-5 font-body text-muted">Your conversations with {coach.data.name} will appear here.</Text> : null}
        </View>
      </View>
    </Screen>
  );
}
