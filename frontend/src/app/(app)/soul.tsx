import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { coachApi } from '@/api/coach.api';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { Screen } from '@/components/common/Screen';
import { MotionPressable } from '@/components/motion/MotionPressable';
import { AccountButton } from '@/components/navigation/AccountButton';
import { ConversationList } from '@/features/chat/components/ConversationList';
import { useSoulMatches } from '@/features/soul/hooks/use-soul';
import type { CompatibilityType, SoulMatch } from '@/features/soul/types/soul.types';

const compatibilityColors: Record<CompatibilityType, string> = {
  'Safe Compatibility': 'border-primary/30 bg-primary/10 text-primary',
  'Passionate Compatibility': 'border-secondary/30 bg-secondary/10 text-secondary',
  'Healing Compatibility': 'border-tertiary/30 bg-tertiary/10 text-tertiary',
  'Growth Compatibility': 'border-primary/30 bg-primary/10 text-primary',
  'Long-Term Compatibility': 'border-secondary/30 bg-secondary/10 text-secondary',
};

export default function SoulScreen() {
  const coach = useQuery({ queryKey: ['coach'], queryFn: coachApi.get });
  const matches = useSoulMatches();
  const coachName = coach.data?.name ?? 'Your coach';
  const peerVoice = coach.data?.traits.includes('BRO_VIBE') || coach.data?.traits.includes('SISTER_VIBE');
  const count = matches.data?.length ?? 0;
  const matchHeadline = matches.isLoading
    ? 'Your recommendations are taking shape…'
    : peerVoice
      ? count === 1
        ? 'Okay… this person is genuinely interesting for you.'
        : `Okay… these ${count} people are genuinely interesting for you.`
      : `I found ${count} ${count === 1 ? 'person' : 'people'} who ${count === 1 ? 'is' : 'are'} genuinely interesting for you.`;

  return (
    <Screen>
      <View className="pb-8 pt-3">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="font-headline text-3xl font-bold text-secondary">Soul</Text>
            <Text className="mt-1 text-xs font-bold uppercase tracking-[2px] text-muted">Intentional discovery</Text>
          </View>
          <AccountButton />
        </View>

        <View className="mt-8 flex-row items-end justify-between">
          <View><Text className="font-headline text-xl font-bold text-ink">Your conversations</Text><Text className="mt-1 text-sm text-muted">Continue where you left off.</Text></View>
          <View className="rounded-full bg-primary/15 px-3 py-1.5"><Text className="text-[10px] font-bold uppercase tracking-wider text-primary">Private</Text></View>
        </View>
        <ConversationList />

        <View className="mb-5 mt-9 overflow-hidden rounded-[28px] border border-secondary/30 bg-surface">
          <View className="h-1 bg-secondary" />
          <View className="p-6">
            <View className="self-start rounded-full bg-secondary/10 px-3 py-1.5">
              <Text className="text-[9px] font-bold uppercase tracking-[2px] text-secondary">{coachName} found something</Text>
            </View>
            <Text className="mt-4 font-headline text-2xl font-bold leading-8 text-ink">
              {matchHeadline}
            </Text>
            <Text className="mt-3 text-sm leading-6 text-muted">
              Not random profiles. These are reciprocal recommendations shaped by both Soulprints and the details each person chose to share for matching.
            </Text>
            <View className="mt-4 flex-row items-center">
              <View className="mr-2 h-2 w-2 rounded-full bg-secondary" />
              <Text className="text-xs font-bold text-ink">No one-sided swiping. Compatibility is evaluated both ways.</Text>
            </View>
          </View>
        </View>

        <View className="gap-5">
          {matches.isLoading ? <View className="items-center rounded-3xl border border-border bg-surface py-12"><ActivityIndicator color="#D4AF37" /><Text className="mt-3 text-sm text-muted">Your coach is comparing emotional compatibility…</Text></View> : null}
          {matches.error ? <ErrorMessage message="Unable to calculate your suggestions right now." /> : null}
          {matches.data?.map((match, index) => <MatchCard key={match.userId} match={match} coachName={coachName} rank={index + 1} />)}
          {!matches.isLoading && !matches.error && !matches.data?.length ? <View className="rounded-3xl border border-dashed border-border p-7"><Text className="text-center font-bold text-ink">Your suggestions are still taking shape</Text><Text className="mt-2 text-center text-sm leading-6 text-muted">Keep talking with your coach and allow selected Soulprint details for matching. Recommendations appear when there is enough meaningful context.</Text></View> : null}
        </View>
      </View>
    </Screen>
  );
}

function MatchCard({ match, coachName, rank }: { match: SoulMatch; coachName: string; rank: number }) {
  const colors = compatibilityColors[match.compatibilityType];
  return (
    <View className="overflow-hidden rounded-[28px] border border-border bg-surface">
      <View className="p-5">
        <View className="flex-row items-center">
          <View className="h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/15"><Text className="font-headline text-2xl font-bold text-primary">{match.name.slice(0, 1)}</Text></View>
          <View className="ml-4 flex-1">
            <View className="flex-row items-center"><Text className="font-headline text-xl font-bold text-ink">{match.name}, {match.age}</Text><Text className="ml-2 text-[10px] font-bold text-muted">#{rank}</Text></View>
            <Text className="mt-1 text-sm font-semibold text-ink">{match.job}</Text>
            <Text className="mt-0.5 text-xs text-muted">{match.city}, {match.country}</Text>
          </View>
          <View className="items-end"><Text className="text-xl font-bold text-secondary">{match.scoreMin}%–{match.scoreMax}%</Text><Text className="max-w-20 text-right text-[8px] font-bold uppercase leading-3 tracking-wider text-muted">Compatibility estimate</Text></View>
        </View>

        <View className={`mt-5 self-start rounded-full border px-3 py-2 ${colors}`}>
          <Text className={`text-[10px] font-bold uppercase tracking-[1.5px] ${colors.split(' ').at(-1)}`}>{match.compatibilityType}</Text>
        </View>

        <View className="mt-5 gap-4">
          <ProfileDetail label="Presence" value={match.physicalDescription} />
          <ProfileDetail label="Personality" value={match.personalityDescription} />
        </View>

        <View className="mt-5 rounded-2xl border border-secondary/20 bg-secondary/5 p-4">
          <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-secondary">{`${coachName}'s take`}</Text>
          <Text className="mt-2 text-sm italic leading-6 text-ink">“{match.coachInsight}”</Text>
        </View>

        <View className="mt-4 flex-row items-center rounded-2xl bg-surface-raised px-4 py-3">
          <View className="mr-3 h-7 w-7 items-center justify-center rounded-full bg-primary/15"><Text className="font-bold text-primary">↔</Text></View>
          <View className="flex-1"><Text className="text-xs font-bold text-ink">Reciprocal compatibility</Text><Text className="mt-0.5 text-[11px] text-muted">This recommendation was evaluated from both sides.</Text></View>
        </View>
      </View>
      <MotionPressable accessibilityRole="button" accessibilityLabel={`Explore connection with ${match.name}`} onPress={() => router.push(`/(app)/person/${match.userId}`)} className="min-h-14 items-center justify-center border-t border-border bg-secondary"><Text className="font-bold text-[#25262E]">Explore this connection →</Text></MotionPressable>
    </View>
  );
}

function ProfileDetail({ label, value }: { label: string; value: string }) {
  return <View><Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-muted">{label}</Text><Text className="mt-1 text-sm leading-6 text-ink">{value}</Text></View>;
}
