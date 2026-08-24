'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, Search, Sparkles, X } from 'lucide-react';
import { api, json } from '@/services/api';
import type { Coach, MatchDecision, MatchmakingOverview, MatchResponseResult } from '@/types';
import { Failure, Loading } from '@/components/remote';

const typeColors: Record<string, { pill: string; text: string }> = {
  'Safe Compatibility': {
    pill: 'var(--pink)',
    text: 'color-mix(in srgb, var(--pink) 55%, var(--ink))',
  },
  'Passionate Compatibility': {
    pill: 'var(--secondary)',
    text: 'color-mix(in srgb, var(--secondary) 55%, var(--ink))',
  },
  'Healing Compatibility': {
    pill: 'var(--violet)',
    text: 'color-mix(in srgb, var(--violet) 55%, var(--ink))',
  },
  'Growth Compatibility': {
    pill: 'var(--pink)',
    text: 'color-mix(in srgb, var(--pink) 55%, var(--ink))',
  },
  'Long-Term Compatibility': {
    pill: 'var(--secondary)',
    text: 'color-mix(in srgb, var(--secondary) 55%, var(--ink))',
  },
};

function MatchmakingEmptyState({ overview, coachName, activating, error, onActivate }: {
  overview: MatchmakingOverview;
  coachName: string;
  activating: boolean;
  error: string | null;
  onActivate: () => void;
}) {
  if (overview.status === 'READY') {
    return (
      <div className="panel card matchmaking-state ready">
        <span className="matchmaking-state-icon"><Sparkles size={24} aria-hidden="true" /></span>
        <div className="eyebrow">Ready when you are</div>
        <h2>{coachName} knows enough to start looking</h2>
        <p className="muted">
          Your Soulprint will keep evolving. Starting the search allows the non-sensitive
          details you shared with your coach to be used for compatible introductions.
        </p>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="button" disabled={activating} onClick={onActivate}>
          {activating ? 'Starting the search...' : 'Start looking'}
        </button>
      </div>
    );
  }
  if (overview.status === 'SEARCHING' || overview.status === 'NO_MATCH_YET' || overview.status === 'MATCH_READY') {
    return (
      <div className="panel card matchmaking-state searching">
        <span className="matchmaking-state-icon"><Search size={24} aria-hidden="true" /></span>
        <h2>{overview.status === 'SEARCHING' ? `${coachName} is looking` : 'No introduction yet'}</h2>
        <p className="muted">
          {overview.status === 'NO_MATCH_YET'
            ? "I haven't found someone I feel good about introducing yet. I'd rather wait than force a match."
            : 'You can keep talking with your coach while the search continues quietly.'}
        </p>
      </div>
    );
  }
  return (
    <div className="panel card matchmaking-state shaping">
      <span className="matchmaking-state-icon"><Heart size={24} aria-hidden="true" /></span>
      <h2>Your Soulprint is still taking shape</h2>
      <p className="muted">
        Keep talking naturally with your coach. Matchmaking unlocks when there is enough
        meaningful relationship context, not after a set amount of time.
      </p>
    </div>
  );
}

export default function Soul() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ['matches'], queryFn: () => api<MatchmakingOverview>('/users/matches') });
  const history = useQuery({
    queryKey: ['matches', 'history'],
    queryFn: () => api<MatchDecision[]>('/users/matches/history'),
  });
  const coach = useQuery({ queryKey: ['coach'], queryFn: () => api<Coach>('/coach') });
  const activate = useMutation({
    mutationFn: () => api<MatchmakingOverview>('/users/matches/activate', json('POST', {})),
    onSuccess: (overview) => queryClient.setQueryData(['matches'], overview),
  });
  const decide = useMutation({
    mutationFn: ({ userId, response }: { userId: string; response: 'ACCEPTED' | 'REJECTED' }) =>
      api<MatchResponseResult>(`/users/matches/${userId}/respond`, json('POST', { response })),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
      void queryClient.invalidateQueries({ queryKey: ['matches', 'history'] });
      if (result.mutual && result.conversation) router.push(`/app/messages/${result.conversation.id}`);
    },
  });
  if (q.isLoading || history.isLoading)
    return (
      <div className="page">
        <Loading />
      </div>
    );
  if (q.isError || history.isError)
    return (
      <div className="page">
        <Failure retry={() => void Promise.all([q.refetch(), history.refetch()])} />
      </div>
    );
  const coachName = coach.data?.name ?? 'Your coach';
  const peerVoice =
    coach.data?.traits.includes('BRO_VIBE') || coach.data?.traits.includes('SISTER_VIBE');
  const suggestions = q.data?.matches ?? [];
  const count = suggestions.length;
  const headline = q.isLoading
    ? 'Your recommendations are taking shape…'
    : peerVoice
      ? count === 1
        ? 'Okay… this person is genuinely interesting for you.'
        : `Okay… these ${count} people are genuinely interesting for you.`
      : `I found ${count} ${count === 1 ? 'person' : 'people'} who ${
          count === 1 ? 'is' : 'are'
        } genuinely interesting for you.`;
  const accepted = (history.data ?? []).filter((item) => item.response === 'ACCEPTED');
  const passed = (history.data ?? []).filter((item) => item.response === 'REJECTED');
  return (
    <div className="page soul-page">
      <header className="page-head soul-page-head">
        <div>
          <div className="eyebrow">Soul</div>
          <h1>People worth a closer look</h1>
          <p className="muted">Intentional discovery — reciprocal recommendations, not endless swiping.</p>
        </div>
        <div className="soul-overview" aria-label="Soul overview">
          <div><strong>{count}</strong><span>Suggestions</span></div>
          <div><strong>{accepted.length}</strong><span>Accepted</span></div>
        </div>
      </header>
      {decide.isError && (
        <p className="error" role="alert">
          {decide.error.message}
        </p>
      )}
      <div className="soul-layout">
      <div className="soul-suggestions">
      {suggestions.length > 0 && <div className="panel card soul-intro">
        <div className="soul-intro-main">
          <div className="eyebrow">{coachName} found something</div>
          <h2>{headline}</h2>
          <p className="muted">These profiles were chosen using what both people shared.</p>
        </div>
        <p className="soul-intro-check">Both profiles were checked.</p>
      </div>}
      {!suggestions.length ? (
        <MatchmakingEmptyState
          overview={q.data!}
          coachName={coachName}
          activating={activate.isPending}
          error={activate.isError ? activate.error.message : null}
          onActivate={() => activate.mutate()}
        />
      ) : (
        <div className="soul-grid">
          {suggestions.map((m) => (
            <article className="panel card soul-card" key={m.userId}>
              <div className="soul-card-head">
                <div className="soul-person">
                  <span className="soul-match-avatar" aria-hidden="true">{m.name.slice(0, 1).toUpperCase()}</span>
                  <div>
                  <h2>
                    {m.name}, {m.age}
                  </h2>
                  <p className="muted">
                    {m.job || 'Occupation not shared yet'} · {m.city}, {m.country}
                  </p>
                  </div>
                </div>
                <div className="soul-score">
                  <strong>
                    {m.scoreMin}%–{m.scoreMax}%
                  </strong>
                  <small>Compatibility</small>
                </div>
              </div>
              {(() => {
                const colors = typeColors[m.compatibilityType] ?? typeColors['Safe Compatibility'];
                return (
                  <span className="soul-type-pill" style={{ borderColor: colors.pill, color: colors.text }}>
                    {m.compatibilityType}
                  </span>
                );
              })()}
              <h3>Why you may connect</h3>
              <ul>{m.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
              <h3>A glimpse</h3>
              <p>{m.physicalDescription}</p>
              <blockquote className="panel card">
                <div className="eyebrow">{coachName}&apos;s take</div>
                <p>{m.coachInsight}</p>
              </blockquote>
              <div className="action-row">
                <button
                  className="button secondary"
                  disabled={decide.isPending}
                  onClick={() =>
                    decide.mutate({ userId: m.userId, response: 'REJECTED' })
                  }
                >
                  <X size={17} aria-hidden="true" /> Not for me
                </button>
                <button
                  className="button"
                  disabled={decide.isPending}
                  onClick={() =>
                    decide.mutate({ userId: m.userId, response: 'ACCEPTED' })
                  }
                >
                  <Heart size={17} aria-hidden="true" /> Interested
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      </div>
      <div className="soul-history-grid">
      <section className="soul-history-section">
        <div className="soul-history-head">
          <h2>Accepted matches</h2>
          {accepted.length > 3 && <Link className="text-link small" href="/app/soul/history#accepted">View all</Link>}
        </div>
        {!accepted.length ? (
          <p className="muted">You have not accepted any matches yet.</p>
        ) : (
          <div className="stack">
            {accepted.slice(0, 3).map((item) => (
              <article className="panel card soul-history-card" key={`${item.userId}-${item.respondedAt}`}>
                <div className="soul-history-card-head">
                  <div>
                    <strong>
                      {item.name}, {item.age}
                    </strong>
                    <div className="muted">
                      {item.job || 'Occupation not shared'} · {item.city}, {item.country}
                    </div>
                  </div>
                  <span className="soul-history-status accepted">Accepted</span>
                </div>
                <small>{new Date(item.respondedAt).toLocaleDateString()}</small>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="soul-history-section">
        <div className="soul-history-head">
          <h2>Passed matches</h2>
          {passed.length > 3 && <Link className="text-link small" href="/app/soul/history#passed">View all</Link>}
        </div>
        {!passed.length ? (
          <p className="muted">You have not passed on any matches yet.</p>
        ) : (
          <div className="stack">
            {passed.slice(0, 3).map((item) => (
              <article className="panel card soul-history-card" key={`${item.userId}-${item.respondedAt}`}>
                <div className="soul-history-card-head">
                  <div>
                    <strong>
                      {item.name}, {item.age}
                    </strong>
                    <div className="muted">
                      {item.job || 'Occupation not shared'} · {item.city}, {item.country}
                    </div>
                  </div>
                  <span className="soul-history-status passed">Passed</span>
                </div>
                <small>{new Date(item.respondedAt).toLocaleDateString()}</small>
              </article>
            ))}
          </div>
        )}
      </section>
      </div>
      </div>
    </div>
  );
}
