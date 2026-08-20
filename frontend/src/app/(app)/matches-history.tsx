import { useState } from 'react';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Screen } from '@/components/common/Screen';
import { BackButton } from '@/components/navigation/BackButton';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { useMatchHistory } from '@/features/soul/hooks/use-soul';

type Tab = 'accepted' | 'rejected';

export default function MatchHistoryScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'rejected' ? 'rejected' : 'accepted');
  const history = useMatchHistory();
  const response = tab === 'accepted' ? 'ACCEPTED' : 'REJECTED';
  const items = history.data?.filter((item) => item.response === response) ?? [];

  return (
    <Screen>
      <View className="pb-8">
        <View className="flex-row items-center">
          <BackButton fallbackHref="/(app)/soul" />
          <Text className="ml-3 font-headline text-2xl font-bold text-ink">Match decisions</Text>
        </View>
        <Text className="mt-3 text-sm leading-6 text-muted">Review the profiles you accepted or passed on.</Text>

        <View className="mt-6 flex-row rounded-2xl bg-surface-raised p-1">
          <TabButton label="Accepted" active={tab === 'accepted'} onPress={() => setTab('accepted')} />
          <TabButton label="Not now" active={tab === 'rejected'} onPress={() => setTab('rejected')} />
        </View>

        {history.isLoading ? <ActivityIndicator className="mt-12" color="#D4AF37" /> : null}
        {history.error ? <View className="mt-6"><ErrorMessage message="Unable to load your match decisions." /></View> : null}
        {!history.isLoading && !history.error ? (
          <View className="mt-5 gap-3">
            {items.map((item) => (
              <Pressable
                key={item.userId}
                accessibilityRole="button"
                onPress={() => router.push(`/(app)/person/${item.userId}` as Href)}
                className="flex-row items-center rounded-[22px] border border-border bg-surface p-4"
              >
                <View className="h-14 w-14 items-center justify-center rounded-full bg-primary/15">
                  <Text className="text-xl font-bold text-primary">{item.name.slice(0, 1).toUpperCase()}</Text>
                </View>
                <View className="ml-4 flex-1">
                  <Text className="font-headline text-lg font-bold text-ink">{item.name}, {item.age}</Text>
                  <Text className="mt-1 text-sm text-ink">{item.job}</Text>
                  <Text className="mt-1 text-xs text-muted">{item.city}, {item.country}</Text>
                </View>
                <View className="items-end">
                  <Text className="font-bold text-secondary">{item.score}%</Text>
                  <Text className="mt-1 text-[10px] text-muted">View profile</Text>
                </View>
              </Pressable>
            ))}
            {!items.length ? <Text className="rounded-2xl border border-dashed border-border p-6 text-center text-muted">No {tab === 'accepted' ? 'accepted' : 'rejected'} matches yet.</Text> : null}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={`min-h-12 flex-1 items-center justify-center rounded-xl ${active ? 'bg-secondary' : ''}`}>
      <Text className={`font-bold ${active ? 'text-[#25262E]' : 'text-muted'}`}>{label}</Text>
    </Pressable>
  );
}
