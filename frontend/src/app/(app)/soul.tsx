import { useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { coachApi } from '@/api/coach.api';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { Screen } from '@/components/common/Screen';
import { MotionPressable } from '@/components/motion/MotionPressable';
import { AccountButton } from '@/components/navigation/AccountButton';
import { Button } from '@/components/common/Button';
import { useActivateMatchmaking, useMatchHistory, useRespondSoulMatch, useSoulMatches } from '@/features/soul/hooks/use-soul';
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
  const activate = useActivateMatchmaking();
  const respond = useRespondSoulMatch();
  const history = useMatchHistory();
  const coachName = coach.data?.name ?? 'Your coach';
  const peerVoice = coach.data?.traits.includes('BRO_VIBE') || coach.data?.traits.includes('SISTER_VIBE');
  const suggestions = matches.data?.matches ?? [];
  const count = suggestions.length;
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

        <View className="mt-8 rounded-[24px] border border-border bg-surface p-4">
          <Text className="font-headline text-lg font-bold text-ink">Match decisions</Text>
          <Text className="mt-1 text-sm text-muted">Profiles you accepted or passed on.</Text>
          <View className="mt-4 flex-row gap-3">
            <MotionPressable onPress={() => router.push('/(app)/matches-history?tab=accepted' as Href)} className="min-h-20 flex-1 justify-center rounded-2xl bg-secondary/10 px-4">
              <Text className="text-2xl font-bold text-secondary">{history.data?.filter((item) => item.response === 'ACCEPTED').length ?? 0}</Text>
              <Text className="mt-1 text-sm font-bold text-ink">Accepted</Text>
            </MotionPressable>
            <MotionPressable onPress={() => router.push('/(app)/matches-history?tab=rejected' as Href)} className="min-h-20 flex-1 justify-center rounded-2xl bg-surface-raised px-4">
              <Text className="text-2xl font-bold text-muted">{history.data?.filter((item) => item.response === 'REJECTED').length ?? 0}</Text>
              <Text className="mt-1 text-sm font-bold text-ink">Not now</Text>
            </MotionPressable>
          </View>
        </View>

        {suggestions.length ? <View className="mb-5 mt-9 overflow-hidden rounded-[28px] border border-secondary/30 bg-surface">
          <View className="h-1 bg-secondary" />
          <View className="p-6">
            <View className="self-start rounded-full bg-secondary/10 px-3 py-1.5">
              <Text className="text-[9px] font-bold uppercase tracking-[2px] text-secondary">{coachName} found something</Text>
            </View>
            <Text className="mt-4 font-headline text-2xl font-bold leading-8 text-ink">
              {matchHeadline}
            </Text>
            <Text className="mt-3 text-sm leading-6 text-muted">
              These profiles were chosen using what both people shared.
            </Text>
            <View className="mt-4 flex-row items-center">
              <View className="mr-2 h-2 w-2 rounded-full bg-secondary" />
              <Text className="text-xs font-bold text-ink">Both profiles were checked.</Text>
            </View>
          </View>
        </View> : <View className="mt-4" />}

        <View className="gap-5">
          {matches.isLoading ? <View className="items-center rounded-3xl border border-border bg-surface py-12"><ActivityIndicator color="#D4AF37" /><Text className="mt-3 text-sm text-muted">Your coach is comparing emotional compatibility…</Text></View> : null}
          {matches.error ? <ErrorMessage message="Unable to calculate your suggestions right now." /> : null}
          {suggestions.map((match) => <MatchCard key={match.userId} match={match} coachName={coachName} respond={respond} />)}
          {!matches.isLoading && !matches.error && matches.data && !suggestions.length ? (
            <MatchmakingEmptyState overview={matches.data} coachName={coachName} activating={activate.isPending} onActivate={() => activate.mutate()} />
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

function MatchmakingEmptyState({ overview, coachName, activating, onActivate }: {
  overview: NonNullable<ReturnType<typeof useSoulMatches>['data']>;
  coachName: string;
  activating: boolean;
  onActivate: () => void;
}) {
  if (overview.status === 'READY') {
    return (
      <View className="rounded-3xl border border-secondary/30 bg-surface p-7">
        <Text className="text-center font-headline text-xl font-bold text-ink">{coachName} knows enough to start looking</Text>
        <Text className="mt-3 text-center text-sm leading-6 text-muted">Your Soulprint will keep evolving. By starting, you allow the non-sensitive details you shared with your coach to be used for compatible introductions.</Text>
        <View className="mt-5"><Button label="Start looking" loading={activating} onPress={onActivate} /></View>
      </View>
    );
  }
  if (overview.status === 'NO_MATCH_YET' || overview.status === 'SEARCHING' || overview.status === 'MATCH_READY') {
    return (
      <View className="rounded-3xl border border-dashed border-border p-7">
        <Text className="text-center font-bold text-ink">{overview.status === 'SEARCHING' ? `${coachName} is looking` : 'No introduction yet'}</Text>
        <Text className="mt-2 text-center text-sm leading-6 text-muted">{overview.status === 'NO_MATCH_YET' ? "I haven't found someone I feel good about introducing yet. I'd rather wait than force a match." : 'You can keep talking with your coach while the search continues quietly.'}</Text>
      </View>
    );
  }
  return (
    <View className="rounded-3xl border border-dashed border-border p-7">
      <Text className="text-center font-bold text-ink">Your Soulprint is still taking shape</Text>
      <Text className="mt-2 text-center text-sm leading-6 text-muted">Keep talking naturally with your coach. Matchmaking unlocks when there is enough meaningful relationship context, not after a set amount of time.</Text>
    </View>
  );
}

function MatchCard({ match, coachName, respond }: { match: SoulMatch; coachName: string; respond: ReturnType<typeof useRespondSoulMatch> }) {
  const colors = compatibilityColors[match.compatibilityType];
  const pending = respond.isPending && respond.variables?.userId === match.userId;
  const accepting = pending && respond.variables?.response === 'ACCEPTED';
  const rejecting = pending && respond.variables?.response === 'REJECTED';
  return (
    <View className="overflow-hidden rounded-[28px] border border-border bg-surface">
      <View className="p-5">
        <View className="flex-row items-center">
          <View className="h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/15"><Text className="font-headline text-2xl font-bold text-primary">{match.name.slice(0, 1)}</Text></View>
          <View className="ml-4 flex-1">
            <Text className="font-headline text-xl font-bold text-ink">{match.name}, {match.age}</Text>
            <Text className="mt-1 text-sm font-semibold text-ink">{match.job}</Text>
            <Text className="mt-0.5 text-xs text-muted">{match.city}, {match.country}</Text>
          </View>
          <View className="items-end"><Text className="text-xl font-bold text-secondary">{match.scoreMin}%–{match.scoreMax}%</Text><Text className="max-w-20 text-right text-[8px] font-bold uppercase leading-3 tracking-wider text-muted">Compatibility estimate</Text></View>
        </View>

        <View className={`mt-5 self-start rounded-full border px-3 py-2 ${colors}`}>
          <Text className={`text-[10px] font-bold uppercase tracking-[1.5px] ${colors.split(' ').at(-1)}`}>{match.compatibilityType}</Text>
        </View>

        <View className="mt-5 gap-4">
          {match.reasons.map((reason) => <ProfileDetail key={reason} label="Why you may connect" value={reason} />)}
          <ProfileDetail label="A glimpse" value={match.physicalDescription} />
        </View>

        <View className="mt-5 rounded-2xl border border-secondary/20 bg-secondary/5 p-4">
          <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-secondary">{`${coachName}'s take`}</Text>
          <Text className="mt-2 text-sm leading-6 text-ink">{match.coachInsight}</Text>
        </View>

      </View>
      <View className="flex-row gap-3 border-t border-border p-4">
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel={`Reject suggestion for ${match.name}`}
          disabled={pending}
          onPress={() => respond.mutate({ userId: match.userId, response: 'REJECTED' })}
          className={`min-h-14 flex-1 items-center justify-center rounded-2xl border border-border bg-surface-raised ${pending ? 'opacity-50' : ''}`}
        >
          {rejecting ? <ActivityIndicator color="#9494A3" /> : <Text className="font-bold text-muted">Not for me</Text>}
        </MotionPressable>
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel={`Accept suggestion for ${match.name}`}
          disabled={pending}
          onPress={() => respond.mutate({ userId: match.userId, response: 'ACCEPTED' })}
          className={`min-h-14 flex-1 items-center justify-center rounded-2xl bg-primary ${pending ? 'opacity-50' : ''}`}
        >
          {accepting ? <ActivityIndicator color="#25262E" /> : <Text className="font-bold text-[#25262E]">Interested</Text>}
        </MotionPressable>
      </View>
    </View>
  );
}

function ProfileDetail({ label, value }: { label: string; value: string }) {
  return <View><Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-muted">{label}</Text><Text className="mt-1 text-sm leading-6 text-ink">{value}</Text></View>;
}
