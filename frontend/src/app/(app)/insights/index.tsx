import { useEffect } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/common/Button';
import { AccountButton } from '@/components/navigation/AccountButton';
import { getSoulprintErrorMessage } from '@/features/insights/api/soulprint.api';
import { CategoryCard, ExtractionStatusCard, PageHeader, ProgressCard, StateCard, SummaryCard } from '@/features/insights/components/SoulprintUI';
import { INSIGHTS_COPY, PRIMARY_CATEGORIES } from '@/features/insights/constants/soulprint.constants';
import { useRecalculateSoulprint, useSoulprint, useSoulprintExtractionStatus } from '@/features/insights/hooks/use-soulprint';

export default function InsightsScreen() {
  const query = useSoulprint();
  const refetchSoulprint = query.refetch;
  const refresh = useRecalculateSoulprint();
  const extraction = useSoulprintExtractionStatus();
  const data = query.data;
  // Historical states remain available through History but should not inflate
  // category counts or completeness cues on the active dashboard.
  const activeEntries = data?.entries?.filter((entry) => !['REJECTED', 'SUPERSEDED', 'DELETED'].includes(entry.status)) ?? [];
  const pending = data?.pendingConfirmationCount ?? activeEntries.filter((entry) => entry.status === 'PENDING_CONFIRMATION').length;
  useEffect(() => {
    // Completion can happen while this screen is mounted; refresh the portrait
    // without forcing navigation into the optional review flow.
    if (extraction.data?.status === 'SUCCEEDED') void refetchSoulprint();
  }, [extraction.data?.completedAt, extraction.data?.status, refetchSoulprint]);
  return <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-canvas">
    <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-2 pb-10" refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor="#6366F1" />}>
      <PageHeader back={false} title={INSIGHTS_COPY.title} subtitle={INSIGHTS_COPY.subtitle} rightAction={<AccountButton />} />
      {query.isLoading ? <ActivityIndicator className="mt-16" color="#6366F1" /> : query.isError ? <StateCard message={getSoulprintErrorMessage(query.error)} action={<Button label={INSIGHTS_COPY.retry} onPress={() => query.refetch()} />} /> : data ? <>
        {extraction.data && ['PENDING', 'RUNNING', 'FAILED'].includes(extraction.data.status) ? <ExtractionStatusCard status={extraction.data.status as 'PENDING' | 'RUNNING' | 'FAILED'} attempts={extraction.data.attempts} /> : null}
        <ProgressCard value={data.completenessScore} />
        <SummaryCard summary={data.summary} />
        {pending > 0 ? <Pressable accessibilityRole="button" onPress={() => router.push('/(app)/insights/pending')} className="mt-4 rounded-3xl border border-secondary/50 bg-surface p-5"><View className="flex-row items-center justify-between"><Text className="font-label text-lg font-bold text-ink">{INSIGHTS_COPY.pending}</Text><View className="rounded-full bg-secondary px-3 py-1"><Text className="font-bold text-canvas">{pending}</Text></View></View><Text className="mt-2 text-sm leading-5 text-muted">{INSIGHTS_COPY.pendingDescription}</Text></Pressable> : null}
        <View className="mb-2 mt-7 flex-row items-center justify-between"><Text className="font-label text-xl font-bold text-ink">{INSIGHTS_COPY.categories}</Text><Pressable onPress={() => router.push('/(app)/insights/privacy')}><Text className="font-bold text-primary">{INSIGHTS_COPY.privacy}</Text></Pressable></View>
        <View className="flex-row flex-wrap justify-between">{PRIMARY_CATEGORIES.map((category) => <CategoryCard key={category} category={category} count={activeEntries.filter((entry) => entry.category === category).length} />)}</View>
        <Button label={INSIGHTS_COPY.add} onPress={() => router.push('/(app)/insights/entry/new')} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View History"
          onPress={() => router.push('/(app)/insights/history')}
          className="relative mt-3 min-h-14 w-full items-center justify-center rounded-2xl border border-border bg-surface-raised px-12 active:opacity-80"
        >
          <Text numberOfLines={1} className="text-center font-label text-base font-bold text-ink">
            View History
          </Text>
          <Text className="absolute right-5 text-xl text-primary">›</Text>
        </Pressable>
        <View className="mt-3"><Button variant="ghost" loading={refresh.isPending} label={INSIGHTS_COPY.recalculate} onPress={() => refresh.mutate()} /></View>
        <View className="mt-3"><Button variant="ghost" label={INSIGHTS_COPY.guidance} onPress={() => router.push('/(app)/home')} /></View>
      </> : null}
    </ScrollView>
  </SafeAreaView>;
}
