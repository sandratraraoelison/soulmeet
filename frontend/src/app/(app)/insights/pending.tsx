import { useEffect } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/common/Button';
import { getSoulprintErrorMessage } from '@/features/insights/api/soulprint.api';
import { InferenceReviewCard, PageHeader, StateCard } from '@/features/insights/components/SoulprintUI';
import { INSIGHTS_COPY } from '@/features/insights/constants/soulprint.constants';
import { useConfirmSoulprintEntry, usePendingSoulprint, useRejectSoulprintEntry } from '@/features/insights/hooks/use-soulprint';

export default function PendingScreen() {
  const query = usePendingSoulprint();
  const confirm = useConfirmSoulprintEntry();
  const reject = useRejectSoulprintEntry();
  const entries = query.data?.pages.flatMap((page) => page.entries) ?? [];
  const entry = entries[0];

  useEffect(() => {
    // Optimistic confirmation removes the current entry. If that empties a
    // page while another cursor exists, load forward automatically.
    if (!query.isLoading && !entry && query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [entry, query]);

  const fail = (error: unknown) => Alert.alert('Unable to update', getSoulprintErrorMessage(error));
  const remaining = entries.length;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-canvas px-5">
      <PageHeader title={INSIGHTS_COPY.pending} subtitle="Your coach noticed something for you to review." />
      {query.isLoading ? (
        <ActivityIndicator color="#6366F1" />
      ) : query.isError ? (
        <StateCard message={getSoulprintErrorMessage(query.error)} action={<Button label={INSIGHTS_COPY.retry} onPress={() => query.refetch()} />} />
      ) : entry ? (
        <View className="flex-1">
          <View className="mb-3 flex-row items-center justify-between px-1">
            <Text className="font-label text-xs font-bold uppercase tracking-widest text-muted">Coach reflection</Text>
            <Text className="text-xs text-muted">{remaining} {remaining === 1 ? 'suggestion' : 'suggestions'} left</Text>
          </View>
          <InferenceReviewCard
            entry={entry}
            confirming={confirm.isPending}
            dismissing={reject.isPending}
            onConfirm={() => confirm.mutate({ id: entry.id }, { onError: fail })}
            onCorrect={(correctedValue) => confirm.mutate({ id: entry.id, correctedValue }, { onError: fail })}
            onDismiss={() => reject.mutate(entry.id, { onError: fail })}
          />
          <Text className="mt-5 px-4 text-center text-xs leading-5 text-muted">You’re always in control. Confirming helps your coach understand you; dismissing removes the suggestion.</Text>
        </View>
      ) : (
        <StateCard message={INSIGHTS_COPY.noPending} />
      )}
    </SafeAreaView>
  );
}
