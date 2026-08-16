import React from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/common/Button';
import { displayValue, getSoulprintErrorMessage } from '@/features/insights/api/soulprint.api';
import { PageHeader } from '@/features/insights/components/SoulprintUI';
import { INSIGHTS_COPY, SOURCE_LABELS, SOULPRINT_CATEGORY_META, VISIBILITY_META } from '@/features/insights/constants/soulprint.constants';
import { useConfirmSoulprintEntry, useDeleteSoulprintEntry, useSoulprintEntry, useSoulprintVisibility, useUpdateSoulprintEntry } from '@/features/insights/hooks/use-soulprint';
import type { SoulprintVisibility } from '@/features/insights/types/soulprint.types';

export default function EntryDetailScreen() {
  const id = useLocalSearchParams<{ entryId: string }>().entryId; const query = useSoulprintEntry(id); const update = useUpdateSoulprintEntry(); const remove = useDeleteSoulprintEntry(); const confirm = useConfirmSoulprintEntry(); const visibility = useSoulprintVisibility();
  const [editing, setEditing] = React.useState(false); const [value, setValue] = React.useState(''); const entry = query.data;
  React.useEffect(() => { if (entry) setValue(displayValue(entry.value)); }, [entry]);
  const fail = (error: unknown) => Alert.alert('Unable to update', getSoulprintErrorMessage(error));
  if (!entry) return <SafeAreaView edges={['top']} className="flex-1 bg-canvas px-5"><PageHeader title={INSIGHTS_COPY.details} />{query.isLoading ? <Text className="text-muted">Loading…</Text> : <Text className="text-danger">{getSoulprintErrorMessage(query.error)}</Text>}</SafeAreaView>;
  const meta = SOULPRINT_CATEGORY_META[entry.category];
  return <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-canvas"><ScrollView contentContainerClassName="px-5 pb-10"><PageHeader title={INSIGHTS_COPY.details} subtitle={meta.label} />
    <View className="rounded-3xl border border-border bg-surface p-5"><Text className="text-3xl text-secondary">{meta.icon}</Text>{entry.key ? <Text className="mt-3 font-label font-bold text-muted">{entry.key}</Text> : null}{editing ? <TextInput autoFocus multiline value={value} onChangeText={setValue} textAlignVertical="top" className="mt-3 min-h-28 rounded-2xl border border-primary bg-surface-raised p-4 text-ink" /> : <Text className="mt-3 text-lg leading-7 text-ink">{displayValue(entry.value)}</Text>}
      <Text className="mt-5 text-xs font-bold uppercase tracking-wider text-muted">{INSIGHTS_COPY.source}</Text><Text className="mt-1 text-ink">{SOURCE_LABELS[entry.source]}</Text><Text className="mt-4 text-xs font-bold uppercase tracking-wider text-muted">{INSIGHTS_COPY.updated}</Text><Text className="mt-1 text-ink">{new Date(entry.updatedAt).toLocaleDateString()}</Text>
    </View>
    {editing ? <View className="mt-4 flex-row gap-3"><View className="flex-1"><Button variant="secondary" label={INSIGHTS_COPY.cancel} onPress={() => { setValue(displayValue(entry.value)); setEditing(false); }} /></View><View className="flex-1"><Button label={INSIGHTS_COPY.save} loading={update.isPending} onPress={() => update.mutate({ id, input: { value: value.trim() } }, { onSuccess: () => setEditing(false), onError: fail })} /></View></View> : <View className="mt-4"><Button variant="secondary" label={INSIGHTS_COPY.edit} onPress={() => setEditing(true)} /></View>}
    {entry.status === 'PENDING_CONFIRMATION' ? <View className="mt-3"><Button label={INSIGHTS_COPY.confirm} loading={confirm.isPending} onPress={() => confirm.mutate({ id }, { onError: fail })} /></View> : null}
    <Text className="mb-2 mt-6 font-label text-lg font-bold text-ink">{INSIGHTS_COPY.visibility}</Text>{(Object.keys(VISIBILITY_META) as SoulprintVisibility[]).map((item) => <Button key={item} variant={entry.visibility === item ? 'primary' : 'secondary'} label={VISIBILITY_META[item].label} onPress={() => visibility.mutate({ id, visibility: item }, { onError: fail })} />)}
    {entry.evidence?.length ? <View className="mt-6 rounded-2xl border border-border bg-surface p-4"><Text className="font-label font-bold text-ink">{INSIGHTS_COPY.evidence}</Text>{entry.evidence.map((item) => <Text key={item.id} className="mt-2 italic text-muted">“{item.excerpt ?? 'Based on a previous interaction'}”</Text>)}</View> : null}
    <View className="mt-6"><Button variant="ghost" label={INSIGHTS_COPY.delete} onPress={() => Alert.alert(INSIGHTS_COPY.deleteTitle, INSIGHTS_COPY.deleteBody, [{ text: INSIGHTS_COPY.cancel, style: 'cancel' }, { text: INSIGHTS_COPY.delete, style: 'destructive', onPress: () => remove.mutate(id, { onSuccess: () => router.back(), onError: fail }) }])} /></View>
  </ScrollView></SafeAreaView>;
}
