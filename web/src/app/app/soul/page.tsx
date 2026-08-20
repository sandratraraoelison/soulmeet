'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { Coach, MatchDecision, SoulMatch } from '@/types';
import { Failure, Loading } from '@/components/remote';
import { useGenericMutation } from '@/lib/use-generic-mutation';

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

export default function Soul() {
  const q = useQuery({ queryKey: ['matches'], queryFn: () => api<SoulMatch[]>('/users/matches') });
  const history = useQuery({
    queryKey: ['matches', 'history'],
    queryFn: () => api<MatchDecision[]>('/users/matches/history'),
  });
  const coach = useQuery({ queryKey: ['coach'], queryFn: () => api<Coach>('/coach') });
  const decide = useGenericMutation([['matches'], ['matches', 'history']]);
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
  const count = q.data?.length ?? 0;
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
      <div className="panel card soul-intro">
        <div className="soul-intro-main">
          <div className="eyebrow">{coachName} found something</div>
          <h2>{headline}</h2>
          <p className="muted">These profiles were chosen using what both people shared.</p>
        </div>
        <p className="soul-intro-check">Both profiles were checked.</p>
      </div>
      {!q.data?.length ? (
        <div className="panel card" style={{ borderStyle: 'dashed' }}>
          <h2>Your suggestions are still taking shape</h2>
          <p className="muted">
            Keep talking with your coach and allow selected Soulprint details for matching.
            Recommendations appear when there is enough meaningful context.
          </p>
        </div>
      ) : (
        <div className="soul-grid">
          {q.data.map((m, index) => (
            <article className="panel card soul-card" key={m.userId}>
              <div className="soul-card-head">
                <div>
                  <h2>
                    {m.name}, {m.age} <span className="muted">#{index + 1}</span>
                  </h2>
                  <p className="muted">
                    {m.job || 'Occupation not shared yet'} · {m.city}, {m.country}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>
                    {m.scoreMin}%–{m.scoreMax}%
                  </strong>
                  <div className="muted" style={{ fontSize: '0.68rem', maxWidth: 110 }}>
                    Compatibility estimate
                  </div>
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
              <h3>Presence</h3>
              <p>{m.physicalDescription}</p>
              <h3>Personality</h3>
              <p>{m.personalityDescription}</p>
              <blockquote className="panel card">
                <div className="eyebrow">{coachName}&apos;s take</div>
                <p>{m.coachInsight}</p>
              </blockquote>
              <div className="soul-checked">
                <span aria-hidden="true">↔</span>
                <span>
                  <strong>Match checked both ways</strong>
                  <small>This person can also be interested in your profile.</small>
                </span>
              </div>
              <div className="action-row">
                <button
                  className="button secondary"
                  disabled={decide.isPending}
                  onClick={() =>
                    decide.mutate({
                      path: `/users/matches/${m.userId}/respond`,
                      body: { response: 'REJECTED' },
                    })
                  }
                >
                  Not now
                </button>
                <button
                  className="button"
                  disabled={decide.isPending}
                  onClick={() =>
                    decide.mutate({
                      path: `/users/matches/${m.userId}/respond`,
                      body: { response: 'ACCEPTED' },
                    })
                  }
                >
                  Accept
                </button>
              </div>
              <Link className="soul-explore" href={`/app/people/${m.userId}`}>
                Explore this connection →
              </Link>
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
              <article className="panel card" key={`${item.userId}-${item.respondedAt}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <strong>
                      {item.name}, {item.age}
                    </strong>
                    <div className="muted">
                      {item.job || 'Occupation not shared'} · {item.city}, {item.country}
                    </div>
                  </div>
                  <span className="eyebrow">Accepted</span>
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
              <article className="panel card" key={`${item.userId}-${item.respondedAt}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <strong>
                      {item.name}, {item.age}
                    </strong>
                    <div className="muted">
                      {item.job || 'Occupation not shared'} · {item.city}, {item.country}
                    </div>
                  </div>
                  <span className="eyebrow">Passed</span>
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
