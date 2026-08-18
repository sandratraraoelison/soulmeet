import { useEffect, useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { getErrorMessage } from '@/api/client';
import { coachApi } from '@/api/coach.api';
import { BackButton } from '@/components/navigation/BackButton';
import { CopySelectionModal } from '@/components/common/CopySelectionModal';
import { guidanceApi } from '@/features/guidance/api/guidance.api';
import { GuidanceComposer } from '@/features/guidance/components/GuidanceComposer';
import { CoachFaceAvatar } from '@/features/coach/components/CoachFaceAvatar';
import { GuidanceMessageActions } from '@/features/guidance/components/GuidanceMessageActions';
import { GuidanceMessageBubble } from '@/features/guidance/components/GuidanceMessageBubble';
import { useDeleteGuidanceMessage, useGuidanceMessages, useGuidanceStream, useRegenerateGuidanceMessage } from '@/features/guidance/hooks/use-guidance';
import { useGuidanceStore } from '@/features/guidance/store/guidance.store';
import type { GuidanceMessage } from '@/features/guidance/types/guidance.types';

export default function GuidanceChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const history = useGuidanceMessages(conversationId);
  const coach = useQuery({ queryKey: ['coach'], queryFn: coachApi.get });
  const stream = useGuidanceStream(conversationId);
  const remove = useDeleteGuidanceMessage(conversationId);
  const regenerate = useRegenerateGuidanceMessage(conversationId);
  const draft = useGuidanceStore((state) => state.drafts[conversationId] ?? '');
  const loadDraft = useGuidanceStore((state) => state.loadDraft);
  const setDraft = useGuidanceStore((state) => state.setDraft);
  const clearDraft = useGuidanceStore((state) => state.clearDraft);
  const mode = useGuidanceStore((state) => state.activeMode);
  const [selectedMessage, setSelectedMessage] = useState<GuidanceMessage | null>(null);
  const [copyText, setCopyText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const messages = useMemo(() => history.data?.pages.flatMap((page) => page.messages) ?? [], [history.data]);

  useEffect(() => { void loadDraft(conversationId); }, [conversationId, loadDraft]);
  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timeout);
  }, [copied]);

  const send = async () => {
    const content = draft.trim();
    if (!content || stream.isPending) return;
    await clearDraft(conversationId);
    stream.mutate({ content, mode: mode ?? undefined });
  };
  const error = stream.error || history.error || remove.error || regenerate.error;

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <View className="flex-row items-center border-b border-border px-5 py-4">
          <BackButton fallbackHref="/(app)/home" />
          <View className="ml-4"><CoachFaceAvatar appearance={coach.data?.appearance} name={coach.data?.name ?? 'Coach'} size={44} /></View>
          <View className="ml-3"><Text className="font-headline text-xl font-bold text-ink">{coach.data?.name ?? 'Guidance'}</Text><Text className="font-body text-xs text-muted">Your private space with your coach</Text></View>
        </View>
        {error ? <Text accessibilityRole="alert" className="bg-danger/10 px-5 py-2 font-body text-xs text-danger">{getErrorMessage(error)}</Text> : null}
        <FlatList
          inverted
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => <GuidanceMessageBubble message={item} onLongPress={() => setSelectedMessage(item)} />}
          onEndReached={() => history.hasNextPage && !history.isFetchingNextPage && void history.fetchNextPage()}
          ListHeaderComponent={stream.streamingText ? <View className="mb-3 max-w-[86%] rounded-[20px] rounded-bl-sm border border-primary/30 bg-surface px-4 py-3"><Text className="font-body text-base leading-6 text-ink">{stream.streamingText}</Text></View> : null}
          ListEmptyComponent={!history.isLoading ? <View className="mt-24 items-center"><Text className="font-headline text-2xl font-bold text-ink">What’s on your mind?</Text><Text className="mt-2 text-center font-body text-muted">Share as much or as little as you want.</Text></View> : null}
        />
        <GuidanceComposer value={draft} onChangeText={(value) => void setDraft(conversationId, value)} onSend={() => void send()} generating={stream.isPending} onStop={() => void guidanceApi.stopGeneration(conversationId)} />
        {copied ? <View className="absolute bottom-24 self-center rounded-full bg-ink px-5 py-3"><Text className="font-label text-sm font-bold text-canvas">Message copied</Text></View> : null}
        <GuidanceMessageActions
          message={selectedMessage}
          onClose={() => setSelectedMessage(null)}
          onCopy={(message) => { setSelectedMessage(null); setCopyText(message.content); }}
          onDelete={(message) => { setSelectedMessage(null); remove.mutate(message.id); }}
          onRegenerate={(message) => { setSelectedMessage(null); regenerate.mutate(message.id); }}
        />
        <CopySelectionModal text={copyText} onClose={() => setCopyText(null)} onCopied={() => setCopied(true)} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
