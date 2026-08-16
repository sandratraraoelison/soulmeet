import { ActivityIndicator, SectionList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/common/Button';
import { displayValue, getSoulprintErrorMessage } from '@/features/insights/api/soulprint.api';
import { PageHeader, StateCard } from '@/features/insights/components/SoulprintUI';
import { INSIGHTS_COPY, SOURCE_LABELS, VISIBILITY_META } from '@/features/insights/constants/soulprint.constants';
import { useSoulprintHistory } from '@/features/insights/hooks/use-soulprint';
import type { SoulprintChange } from '@/features/insights/types/soulprint.types';

const CHANGE_META: Record<string, { label: string; mark: string; tone: string; markTone: string }> = {
  CREATED: { label: 'Detail added', mark: '+', tone: 'text-secondary', markTone: 'border-secondary/30 bg-secondary/10' },
  EVIDENCE_ADDED: { label: 'New context found', mark: '+', tone: 'text-secondary', markTone: 'border-secondary/30 bg-secondary/10' },
  USER_UPDATED: { label: 'Detail updated', mark: 'E', tone: 'text-primary', markTone: 'border-primary/30 bg-primary/10' },
  MERGED_UPDATED: { label: 'Detail refined', mark: 'E', tone: 'text-primary', markTone: 'border-primary/30 bg-primary/10' },
  USER_CONFIRMED: { label: 'Detail confirmed', mark: 'OK', tone: 'text-secondary', markTone: 'border-secondary/30 bg-secondary/10' },
  USER_CORRECTED_CONFIRMED: { label: 'Detail corrected and confirmed', mark: 'OK', tone: 'text-secondary', markTone: 'border-secondary/30 bg-secondary/10' },
  USER_REJECTED: { label: 'Suggestion dismissed', mark: 'X', tone: 'text-muted', markTone: 'border-border bg-surface-raised' },
  USER_DELETED: { label: 'Detail removed', mark: 'X', tone: 'text-danger', markTone: 'border-danger/30 bg-danger/10' },
  SUPERSEDED_BY_CONTRADICTION: { label: 'Detail replaced', mark: 'E', tone: 'text-tertiary', markTone: 'border-tertiary/30 bg-tertiary/10' },
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function entryValue(value: unknown) {
  const record = asRecord(value);
  return record && 'value' in record ? record.value : value;
}

function entryLabel(change: SoulprintChange) {
  const record = asRecord(change.newValue) ?? asRecord(change.previousValue);
  return typeof record?.key === 'string' && record.key.trim() ? record.key : undefined;
}

function changedAttribute(change: SoulprintChange) {
  const before = asRecord(change.previousValue);
  const after = asRecord(change.newValue);
  if (!before || !after) return undefined;
  if (before.visibility !== after.visibility) {
    const from = VISIBILITY_META[before.visibility as keyof typeof VISIBILITY_META]?.label ?? String(before.visibility);
    const to = VISIBILITY_META[after.visibility as keyof typeof VISIBILITY_META]?.label ?? String(after.visibility);
    return `Visibility: ${from} → ${to}`;
  }
  if (before.source !== after.source) {
    const from = SOURCE_LABELS[before.source as keyof typeof SOURCE_LABELS] ?? String(before.source);
    const to = SOURCE_LABELS[after.source as keyof typeof SOURCE_LABELS] ?? String(after.source);
    return `Source: ${from} → ${to}`;
  }
  if (before.status !== after.status) {
    const format = (value: unknown) => String(value).toLowerCase().replaceAll('_', ' ');
    return `Status: ${format(before.status)} → ${format(after.status)}`;
  }
  return undefined;
}

function changeMeta(type: string) {
  return CHANGE_META[type] ?? {
    label: type.toLowerCase().replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase()),
    mark: 'E',
    tone: 'text-primary',
    markTone: 'border-primary/30 bg-primary/10',
  };
}

function validDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function dayLabel(date: Date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

function HistoryCard({ change, last }: { change: SoulprintChange; last: boolean }) {
  const meta = changeMeta(change.changeType);
  const date = validDate(change.createdAt);
  const before = entryValue(change.previousValue);
  const after = entryValue(change.newValue);
  const showBefore = change.previousValue !== undefined && displayValue(before) !== displayValue(after);
  const showAfter = change.newValue !== undefined && change.changeType !== 'USER_DELETED';
  const attributeChange = changedAttribute(change);

  return (
    <View className="flex-row">
      <View className="mr-3 items-center">
        <View className={`h-10 w-10 items-center justify-center rounded-full border ${meta.markTone}`}>
          <Text className={`font-label text-xs font-bold ${meta.tone}`}>{meta.mark}</Text>
        </View>
        {!last ? <View className="my-1 w-px flex-1 bg-border" /> : null}
      </View>
      <View className="mb-4 flex-1 rounded-2xl border border-border bg-surface p-4">
        <View className="flex-row items-start justify-between">
          <View className="mr-3 flex-1">
            <Text className={`font-label text-base font-bold ${meta.tone}`}>{meta.label}</Text>
            {entryLabel(change) ? <Text className="mt-1 text-xs font-bold uppercase tracking-wider text-muted">{entryLabel(change)}</Text> : null}
          </View>
          {date ? <Text className="text-xs text-muted">{date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</Text> : null}
        </View>

        {showBefore ? (
          <View className="mt-3 rounded-xl bg-surface-raised px-3 py-2">
            <Text className="text-[10px] font-bold uppercase tracking-wider text-muted">Before</Text>
            <Text className="mt-1 text-sm leading-5 text-muted">{displayValue(before)}</Text>
          </View>
        ) : null}
        {showAfter ? (
          <View className={showBefore ? 'mt-2 rounded-xl bg-primary/10 px-3 py-2' : 'mt-3'}>
            {showBefore ? <Text className="text-[10px] font-bold uppercase tracking-wider text-primary">After</Text> : null}
            <Text className={`${showBefore ? 'mt-1' : ''} text-sm leading-5 text-ink`}>{displayValue(after)}</Text>
          </View>
        ) : null}
        {attributeChange ? (
          <View className="mt-3 rounded-xl bg-primary/10 px-3 py-2">
            <Text className="text-sm font-medium text-primary">{attributeChange}</Text>
          </View>
        ) : null}
        {change.reason ? <Text className="mt-3 border-l-2 border-tertiary pl-3 text-sm italic leading-5 text-muted">{change.reason}</Text> : null}
        <Text className="mt-3 text-xs text-muted">{change.changedBy === 'SYSTEM' ? 'Updated by Soulmeet' : 'Updated by you'}</Text>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const query = useSoulprintHistory();
  const changes = query.data?.pages.flatMap((page) => page.changes) ?? [];
  const sections = changes.reduce<{ title: string; data: SoulprintChange[] }[]>((groups, change) => {
    const date = validDate(change.createdAt);
    const title = date ? dayLabel(date) : 'Earlier';
    const current = groups.at(-1);
    if (current?.title === title) current.data.push(change);
    else groups.push({ title, data: [change] });
    return groups;
  }, []);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-canvas px-5">
      <PageHeader title={INSIGHTS_COPY.history} subtitle={INSIGHTS_COPY.historyIntro} />
      {query.isLoading ? (
        <ActivityIndicator color="#6366F1" />
      ) : query.isError ? (
        <StateCard message={getSoulprintErrorMessage(query.error)} action={<Button label={INSIGHTS_COPY.retry} onPress={() => query.refetch()} />} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => item.id ?? `change-${index}`}
          renderSectionHeader={({ section }) => (
            <View className="bg-canvas pb-3 pt-1">
              <Text className="font-label text-xs font-bold uppercase tracking-widest text-muted">{section.title}</Text>
            </View>
          )}
          renderItem={({ item, index, section }) => <HistoryCard change={item} last={index === section.data.length - 1} />}
          ListEmptyComponent={<StateCard message={INSIGHTS_COPY.historyEmpty} />}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) {
              void query.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.25}
          ListFooterComponent={query.isFetchingNextPage ? (
            <View className="items-center py-5">
              <ActivityIndicator color="#6366F1" />
              <Text className="mt-2 text-xs text-muted">Loading older changes…</Text>
            </View>
          ) : <View className="h-2" />}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-8"
        />
      )}
    </SafeAreaView>
  );
}
