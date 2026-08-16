import React from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/common/Button';
import { PageHeader } from '@/features/insights/components/SoulprintUI';
import { INSIGHTS_COPY, PRIMARY_CATEGORIES, SOULPRINT_CATEGORY_META, VISIBILITY_META } from '@/features/insights/constants/soulprint.constants';
import { useCreateSoulprintEntry } from '@/features/insights/hooks/use-soulprint';
import { getSoulprintErrorMessage } from '@/features/insights/api/soulprint.api';
import type { SoulprintCategory, SoulprintVisibility } from '@/features/insights/types/soulprint.types';

export default function NewEntryScreen() {
  const mutation = useCreateSoulprintEntry(); const [category, setCategory] = React.useState<SoulprintCategory>('OTHER'); const [key, setKey] = React.useState(''); const [value, setValue] = React.useState(''); const [visibility, setVisibility] = React.useState<SoulprintVisibility>('GUIDANCE_ONLY');
  const save = () => { if (!value.trim()) return Alert.alert('Add a detail', 'Please enter something you want your Soulprint to remember.'); mutation.mutate({ category, key: key.trim() || undefined, value: value.trim(), visibility }, { onSuccess: () => { Alert.alert(INSIGHTS_COPY.created); router.back(); }, onError: (error) => Alert.alert('Unable to save', getSoulprintErrorMessage(error)) }); };
  return <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-canvas"><ScrollView contentContainerClassName="px-5 pb-10"><PageHeader title={INSIGHTS_COPY.add} />
    <Text className="mb-2 font-label font-bold text-ink">{INSIGHTS_COPY.category}</Text><View className="mb-5 flex-row flex-wrap gap-2">{[...PRIMARY_CATEGORIES, 'OTHER' as const].map((item) => <Pressable key={item} onPress={() => setCategory(item)} className={`rounded-full border px-4 py-3 ${category === item ? 'border-primary bg-primary' : 'border-border bg-surface'}`}><Text className={category === item ? 'font-bold text-white' : 'text-muted'}>{SOULPRINT_CATEGORY_META[item].label}</Text></Pressable>)}</View>
    <Text className="mb-2 font-label font-bold text-ink">{INSIGHTS_COPY.key}</Text><TextInput value={key} onChangeText={setKey} placeholder="For example: Communication pace" placeholderTextColor="#9494A3" className="mb-5 min-h-14 rounded-2xl border border-border bg-surface px-4 text-ink" />
    <Text className="mb-2 font-label font-bold text-ink">{INSIGHTS_COPY.value}</Text><TextInput value={value} onChangeText={setValue} multiline placeholder="Write it in your own words…" placeholderTextColor="#9494A3" textAlignVertical="top" className="mb-5 min-h-32 rounded-2xl border border-border bg-surface p-4 text-ink" />
    <Text className="mb-2 font-label font-bold text-ink">{INSIGHTS_COPY.visibility}</Text>{(Object.keys(VISIBILITY_META) as SoulprintVisibility[]).map((item) => <Pressable key={item} onPress={() => setVisibility(item)} className={`mb-2 rounded-2xl border p-4 ${visibility === item ? 'border-primary bg-surface-raised' : 'border-border bg-surface'}`}><Text className="font-bold text-ink">{VISIBILITY_META[item].label}</Text><Text className="mt-1 text-sm text-muted">{VISIBILITY_META[item].description}</Text></Pressable>)}
    <View className="mt-4"><Button label={INSIGHTS_COPY.save} loading={mutation.isPending} onPress={save} /></View>
  </ScrollView></SafeAreaView>;
}
