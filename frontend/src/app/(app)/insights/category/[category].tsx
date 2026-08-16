import { ActivityIndicator, FlatList, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/common/Button';
import { getSoulprintErrorMessage } from '@/features/insights/api/soulprint.api';
import { EntryCard, PageHeader, StateCard } from '@/features/insights/components/SoulprintUI';
import { INSIGHTS_COPY, SOULPRINT_CATEGORY_META } from '@/features/insights/constants/soulprint.constants';
import { useSoulprintEntries } from '@/features/insights/hooks/use-soulprint';
import { SOULPRINT_CATEGORIES, type SoulprintCategory } from '@/features/insights/types/soulprint.types';

export default function CategoryScreen() {
  const raw = useLocalSearchParams<{ category: string }>().category;
  const category = SOULPRINT_CATEGORIES.includes(raw as SoulprintCategory) ? raw as SoulprintCategory : 'OTHER';
  const query = useSoulprintEntries({ category });
  const entries = query.data?.pages.flatMap((page) => page.entries) ?? [];
  return <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-canvas px-5"><PageHeader title={SOULPRINT_CATEGORY_META[category].label} />
    {query.isLoading ? <ActivityIndicator color="#6366F1" /> : query.isError ? <StateCard message={getSoulprintErrorMessage(query.error)} action={<Button label={INSIGHTS_COPY.retry} onPress={() => query.refetch()} />} /> : <FlatList data={entries} keyExtractor={(item) => item.id} renderItem={({ item }) => <EntryCard entry={item} onPress={() => router.push({ pathname: '/(app)/insights/entry/[entryId]', params: { entryId: item.id } })} />} ListEmptyComponent={<StateCard message={INSIGHTS_COPY.empty} />} ListFooterComponent={query.hasNextPage ? <Button label={INSIGHTS_COPY.loadMore} variant="ghost" loading={query.isFetchingNextPage} onPress={() => query.fetchNextPage()} /> : <Text />} contentContainerClassName="pb-8" />}
  </SafeAreaView>;
}
