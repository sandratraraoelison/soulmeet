import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/common/Button';
import { EntryCard, PageHeader, StateCard } from '@/features/insights/components/SoulprintUI';
import { INSIGHTS_COPY } from '@/features/insights/constants/soulprint.constants';
import { useSoulprintEntries } from '@/features/insights/hooks/use-soulprint';

export default function PrivacyScreen() {
  const query = useSoulprintEntries({ limit: 30 }); const entries = query.data?.pages.flatMap((page) => page.entries) ?? [];
  return <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-canvas px-5"><PageHeader title={INSIGHTS_COPY.privacy} subtitle={INSIGHTS_COPY.privacyIntro} />{query.isLoading ? <ActivityIndicator color="#6366F1" /> : <FlatList data={entries} keyExtractor={(item) => item.id} renderItem={({ item }) => <EntryCard entry={item} onPress={() => router.push({ pathname: '/(app)/insights/entry/[entryId]', params: { entryId: item.id } })} />} ListEmptyComponent={<StateCard message={INSIGHTS_COPY.empty} />} ListFooterComponent={<View>{query.hasNextPage ? <Button variant="ghost" label={INSIGHTS_COPY.loadMore} onPress={() => query.fetchNextPage()} loading={query.isFetchingNextPage} /> : <Text />}</View>} contentContainerClassName="pb-8" />}</SafeAreaView>;
}
