import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/common/Button';
import { Screen } from '@/components/common/Screen';
import { BackButton } from '@/components/navigation/BackButton';
import { MotionPressable } from '@/components/motion/MotionPressable';
import { guidanceApi } from '@/features/guidance/api/guidance.api';
import type { GuidanceMessage } from '@/features/guidance/types/guidance.types';

const dayKey = (value: string) => new Date(value).toDateString();
const dayLabel = (value: string) => {
  const date = new Date(value); const today = new Date(); const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (dayKey(value) === today.toDateString()) return 'Today';
  if (dayKey(value) === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
};

export default function GuidanceHistoryScreen() {
  const [query, setQuery] = useState('');
  const client = useQueryClient();
  const archive = useInfiniteQuery({
    queryKey: ['guidance', 'archive', query.trim()], initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => guidanceApi.getArchive({ limit: 50, cursor: pageParam, query: query.trim() || undefined }),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const remove = useMutation({ mutationFn: guidanceApi.deleteConversation, onSuccess: () => client.invalidateQueries({ queryKey: ['guidance'] }) });
  const messages = useMemo(() => (archive.data?.pages.flatMap((page) => page.messages) ?? []).filter((message) => message.content).reverse(), [archive.data]);
  const confirmDelete = (conversationId: string) => Alert.alert('Delete this conversation?', 'This removes this part of your Coach archive permanently.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(conversationId) }]);
  return <Screen><View className="pb-8">
    <View className="flex-row items-center"><BackButton fallbackHref="/(app)/home" /><View className="ml-3 flex-1"><Text className="font-headline text-2xl font-bold text-ink">Coach archive</Text><Text className="mt-1 text-xs text-muted">One continuous, read-only history.</Text></View></View>
    <TextInput accessibilityLabel="Search Coach archive" value={query} onChangeText={setQuery} placeholder="Search past conversations" placeholderTextColor="#9494A3" className="mt-5 min-h-12 rounded-2xl border border-border bg-surface px-4 text-ink" />
    <View className="mt-4 rounded-2xl border border-primary/30 bg-primary/10 p-4"><Text className="text-sm leading-5 text-ink">To keep talking, go back to your coach.</Text><View className="mt-3"><Button label="Back to your coach" variant="secondary" onPress={() => router.replace('/(app)/home')} /></View></View>
    <View className="mt-6 gap-3">
      {messages.map((message, index) => <ArchiveMessage key={message.id} message={message} previous={messages[index - 1]} onDelete={confirmDelete} />)}
      {!archive.isPending && !messages.length ? <Text className="py-12 text-center text-muted">{query.trim() ? 'No matching messages.' : 'Your Coach archive is empty.'}</Text> : null}
      {archive.isPending ? <Text className="py-8 text-center text-muted">Loading your archive…</Text> : null}
      {archive.isError ? <View><Text className="mb-3 text-center text-danger">Unable to load your archive.</Text><Button label="Try again" variant="secondary" onPress={() => archive.refetch()} /></View> : null}
      {archive.hasNextPage ? <Button label="Load earlier messages" variant="ghost" loading={archive.isFetchingNextPage} onPress={() => archive.fetchNextPage()} /> : null}
    </View>
  </View></Screen>;
}

function ArchiveMessage({ message, previous, onDelete }: { message: GuidanceMessage; previous?: GuidanceMessage; onDelete: (id: string) => void }) {
  const newDay = !previous || dayKey(previous.createdAt) !== dayKey(message.createdAt);
  const newConversation = !previous || previous.conversationId !== message.conversationId;
  return <>
    {newDay ? <View className="my-3 flex-row items-center"><View className="h-px flex-1 bg-border" /><Text className="mx-3 text-xs font-bold text-muted">{dayLabel(message.createdAt)}</Text><View className="h-px flex-1 bg-border" /></View> : null}
    {newConversation ? <MotionPressable accessibilityRole="button" accessibilityLabel="Delete this archived conversation" onPress={() => onDelete(message.conversationId)} className="self-center px-3 py-1"><Text className="text-[11px] text-muted">Delete this conversation</Text></MotionPressable> : null}
    <View className={`max-w-[88%] rounded-2xl px-4 py-3 ${message.role === 'USER' ? 'ml-auto bg-primary' : 'mr-auto border border-border bg-surface'}`}><Text className={message.role === 'USER' ? 'text-white' : 'text-ink'}>{message.content}</Text><Text className={`mt-2 text-[10px] ${message.role === 'USER' ? 'text-white/70' : 'text-muted'}`}>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text></View>
  </>;
}
