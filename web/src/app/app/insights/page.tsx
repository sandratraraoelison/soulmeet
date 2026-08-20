'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronUp, Plus } from 'lucide-react';
import { Failure, Loading } from '@/components/remote';
import { SoulprintEntryCard, displaySoulprintValue } from '@/features/insights/entry-card';
import { soulprintService, type SoulprintHistoryChange } from '@/services/soulprint';
import { useGenericMutation } from '@/lib/use-generic-mutation';
import { categoryMeta } from '@/features/soulprint/constants';
import type { SoulprintEntry } from '@/types';
const changeLabels: Record<string, string> = {
  CREATED: 'Detail added',
  USER_UPDATED: 'Detail updated',
  USER_CONFIRMED: 'Detail confirmed',
  USER_CORRECTED_CONFIRMED: 'Corrected and confirmed',
  MERGED_UPDATED: 'Detail refined',
  EVIDENCE_ADDED: 'New context found',
  SUPERSEDED_BY_CONTRADICTION: 'Detail replaced',
  USER_REJECTED: 'Suggestion dismissed',
  USER_DELETED: 'Detail removed',
};
const changeValue = (change: SoulprintHistoryChange, field: 'previousValue' | 'newValue') => {
  const value = change[field];
  if (value && typeof value === 'object' && 'value' in value) return String((value as { value: unknown }).value);
  if (value === undefined || value === null) return '';
  return JSON.stringify(value);
};
const dayLabel = (date: Date) => {
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (day.getTime() === new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime())
    return 'Today';
  if (day.getTime() === yesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString();
};
function groupByDay(changes: SoulprintHistoryChange[]) {
  const groups = new Map<string, SoulprintHistoryChange[]>();
  for (const change of changes) {
    const label = dayLabel(new Date(change.createdAt));
    const bucket = groups.get(label) ?? [];
    bucket.push(change);
    groups.set(label, bucket);
  }
  return [...groups.entries()];
}
const primaryCategories = [
  'PERSONALITY',
  'CORE_VALUE',
  'INTEREST',
  'RELATIONSHIP_GOAL',
  'EMOTIONAL_NEED',
  'COMMUNICATION_STYLE',
] as const;
const SUMMARY_SECTION_LABELS: Record<string, string> = {
  personality: 'Personality',
  coreValues: 'Core values',
  interests: 'Interests',
  relationshipGoals: 'Relationship goals',
  communicationStyle: 'Communication',
  emotionalNeeds: 'Emotional needs',
  boundaries: 'Boundaries',
  strengths: 'Strengths',
  challenges: 'Challenges',
  partnerPreferences: 'Partner preferences',
};
function summaryOverview(summary: unknown) {
  if (summary && typeof summary === 'object' && !Array.isArray(summary)) {
    const overview = (summary as Record<string, unknown>).overview;
    if (typeof overview === 'string' && overview.trim()) return overview;
  }
  return typeof summary === 'string' ? summary : '';
}
function summarySections(summary: unknown) {
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) return [];
  const record = summary as Record<string, unknown>;
  return Object.entries(SUMMARY_SECTION_LABELS)
    .map(([key, label]) => ({
      label,
      values: (Array.isArray(record[key]) ? record[key] : [])
        .filter((value): value is unknown => Boolean(value))
        .map(displaySoulprintValue)
        .slice(0, 2),
    }))
    .filter((section) => section.values.length > 0)
    .slice(0, 3);
}
const categories = Object.keys(categoryMeta);
const ACTIVE_STATUSES = ['REJECTED', 'SUPERSEDED', 'DELETED'];

function PendingReview({
  entries,
  reviewed,
  busy,
  run,
}: {
  entries: SoulprintEntry[];
  reviewed: string[];
  busy: boolean;
  run: (path: string, body?: unknown) => void;
}) {
  const [correcting, setCorrecting] = useState(false);
  const [draft, setDraft] = useState('');
  const remaining = entries.filter((entry) => !reviewed.includes(entry.id));
  const current = remaining[0];
  if (!current)
    return (
      <div className="panel card">
        <p className="muted">You are all caught up.</p>
      </div>
    );
  const total = remaining.length;
  const meta = categoryMeta[current.category] ?? { label: current.category, icon: '?' };
  return (
    <div className="panel card review-card">
      <div className="review-accent" aria-hidden="true" />
      <div className="review-top">
        <span className="review-badge">{meta.icon}</span>
        <div>
          <h3>Can I tell you something?</h3>
          <span className="eyebrow">{meta.label.toLowerCase()} · coach reflection</span>
        </div>
        <small className="muted">
          {total} {total === 1 ? 'suggestion' : 'suggestions'} left
        </small>
      </div>
      <p className="review-intro">
        I&apos;ve been reflecting on our conversation. I noticed something that might be true for
        you:
      </p>
      <div className="review-value">{displaySoulprintValue(current.value)}</div>
      <p className="muted review-source">
        Suggested from {current.evidence?.length || 'one or more'} of your Guidance messages. This
        remains tentative until you confirm it.
      </p>
      <p className="review-question">Does this resonate with you?</p>
      {correcting ? (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            const value = draft.trim();
            if (!value) return;
            run(`/soulprint/entries/${current.id}/confirm`, { correctedValue: value });
            setCorrecting(false);
            setDraft('');
          }}
        >
          <div className="field">
            <textarea
              aria-label="Corrected insight"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={2000}
              placeholder="How should this be phrased?"
            />
          </div>
          <div className="action-row">
            <button className="button" disabled={busy || !draft.trim()}>
              Save my correction
            </button>
            <button
              type="button"
              className="button ghost"
              disabled={busy}
              onClick={() => setCorrecting(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="review-actions">
          <button
            className="button"
            disabled={busy}
            onClick={() => run(`/soulprint/entries/${current.id}/confirm`)}
          >
            Yes, that feels right
          </button>
          <button
            className="button ghost"
            disabled={busy}
            onClick={() => {
              setDraft(displaySoulprintValue(current.value));
              setCorrecting(true);
            }}
          >
            Not quite — let me correct it
          </button>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => run(`/soulprint/entries/${current.id}/reject`)}
          >
            No, that&apos;s not me
          </button>
        </div>
      )}
    </div>
  );
}
export default function Insights() {
  const [tab, setTab] = useState<'dashboard' | 'review' | 'insights' | 'history'>('dashboard');
  const [reviewed, setReviewed] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullStart = useRef<number | null>(null);
  const markReviewed = (_data: unknown, variables: { path: string }) => {
    const id = variables.path.split('/').filter(Boolean)[2];
    if (id) setReviewed((ids) => (ids.includes(id) ? ids : [...ids, id]));
  };
  const overview = useQuery({ queryKey: ['soulprint'], queryFn: soulprintService.overview });
  const entries = useQuery({
    queryKey: ['soulprint', 'entries'],
    queryFn: soulprintService.entries,
  });
  const pending = useQuery({
    queryKey: ['soulprint', 'pending'],
    queryFn: soulprintService.pending,
  });
  const summary = useQuery({
    queryKey: ['soulprint', 'summary'],
    queryFn: soulprintService.summary,
  });
  const history = useQuery({
    queryKey: ['soulprint', 'history'],
    queryFn: soulprintService.history,
  });
  const extraction = useQuery({
    queryKey: ['soulprint', 'extraction'],
    queryFn: soulprintService.extractionStatus,
    refetchInterval: (x) =>
      ['PENDING', 'RUNNING'].includes(x.state.data?.status ?? '') ? 3000 : false,
  });
  const act = useGenericMutation([['soulprint']]);
  useEffect(() => {
    if (extraction.data?.status === 'SUCCEEDED')
      void Promise.all([overview.refetch(), summary.refetch(), entries.refetch()]);
  }, [extraction.data?.status, overview, summary, entries]);
  const refreshAll = async () => {
    await Promise.all([
      overview.refetch(),
      summary.refetch(),
      entries.refetch(),
      pending.refetch(),
    ]);
  };
  const onPullRelease = () => {
    pullStart.current = null;
    if (pull >= 72) {
      setPull(0);
      setRefreshing(true);
      void refreshAll().finally(() => setRefreshing(false));
    } else setPull(0);
  };
  if (overview.isLoading || entries.isLoading)
    return (
      <div className="page">
        <Loading />
      </div>
    );
  if (overview.isError || entries.isError || !overview.data || !entries.data)
    return (
      <div className="page">
        <Failure retry={() => void Promise.all([overview.refetch(), entries.refetch()])} />
      </div>
    );
  const allEntries = overview.data.entries.length ? overview.data.entries : entries.data.entries;
  const activeEntries = allEntries.filter((entry) => !ACTIVE_STATUSES.includes(entry.status));
  const pendingCount =
    pending.data?.entries.filter((entry) => !reviewed.includes(entry.id)).length ??
    overview.data.pendingConfirmationCount ??
    0;
  const filtered =
    filter === 'ALL'
      ? allEntries
      : allEntries.filter((entry) => entry.category === filter);
  const goInsights = () => {
    setFilter('ALL');
    setTab('insights');
  };
  const goAdd = () => {
    setFilter('ALL');
    setTab('insights');
    setAddOpen(true);
  };
  const storyOverview = summary.data ? summaryOverview(summary.data.summary) : '';
  const storySections = summary.data ? summarySections(summary.data.summary) : [];
  const tabs: Array<['dashboard' | 'review' | 'insights' | 'history', string]> = [
    ['dashboard', 'Dashboard'],
    ['review', 'Review'],
    ['insights', 'Insights'],
    ['history', 'History'],
  ];
  return (
    <div
      className="page"
      onPointerDown={(e) => {
        if (
          tab === 'dashboard' &&
          !refreshing &&
          window.scrollY <= 0 &&
          !(e.target instanceof HTMLElement && e.target.closest('button, a, input, select, textarea'))
        )
          pullStart.current = e.clientY;
      }}
      onPointerMove={(e) => {
        if (pullStart.current == null) return;
        const dy = e.clientY - pullStart.current;
        if (dy <= 0) {
          pullStart.current = null;
          setPull(0);
          return;
        }
        setPull(Math.min(dy, 110));
      }}
      onPointerUp={onPullRelease}
      onPointerLeave={() => {
        pullStart.current = null;
        setPull(0);
      }}
    >
      {(pull > 0 || refreshing) && (
        <div
          className="pull-indicator"
          style={{ height: refreshing ? 44 : Math.max(pull, 30) }}
          aria-hidden="true"
        >
          {refreshing ? 'Refreshing…' : pull >= 72 ? 'Release to refresh' : 'Pull to refresh'}
        </div>
      )}
      <header className="page-head">
        <div>
          <div className="eyebrow">SoulPrint</div>
          <h1>Your Soulprint</h1>
          <p className="muted">A living portrait of what makes you, you.</p>
        </div>
      </header>
      <div className="insights-tabs" role="tablist" aria-label="Soulprint sections">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={`insight-tab ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
            {key === 'review' && pendingCount > 0 && (
              <span className="tab-badge">{pendingCount}</span>
            )}
            {key === 'insights' && activeEntries.length > 0 && (
              <span className="tab-badge soft">{activeEntries.length}</span>
            )}
          </button>
        ))}
      </div>
      {tab === 'dashboard' && (
        <div className="insight-section">
          <div className="panel card">
            <div className="eyebrow">Soulprint completeness</div>
            <div className="progress-head">
              <strong>{overview.data.completenessScore}%</strong>
              <span className="muted">complete</span>
            </div>
            <div className="progress-track" role="progressbar" aria-valuenow={overview.data.completenessScore}>
              <div className="progress-fill" style={{ width: `${overview.data.completenessScore}%` }} />
            </div>
            <p className="muted">Add and confirm details to make your insights more useful.</p>
          </div>
          {summary.data && (
            <section className="panel card story-card">
              <span className="story-accent" aria-hidden="true" />
              <div className="panel-head">
                <div className="story-head">
                  <span className="story-icon" aria-hidden="true">
                    ✦
                  </span>
                  <div>
                    <h2>Your story so far</h2>
                    <p className="muted">A portrait that grows with you</p>
                  </div>
                </div>
                <span className="living-pill">Living</span>
              </div>
              <p className="story-overview">
                {storyOverview ||
                  'Nothing here yet. Add and confirm details to grow your portrait.'}
              </p>
              {storySections.length > 0 && (
                <div className="story-highlights">
                  <span className="eyebrow">Highlights</span>
                  {storySections.map((section) => (
                    <div className="story-highlight" key={section.label}>
                      <span className="story-dot" aria-hidden="true" />
                      <div>
                        <strong>{section.label}</strong>
                        <p className="muted">{section.values.join(' · ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
          {extraction.data && ['PENDING', 'RUNNING', 'FAILED'].includes(extraction.data.status) && (
            <div
              className={`extraction-card ${extraction.data.status === 'FAILED' ? 'failed' : ''}`}
              role="status"
            >
              <span
                className={`extraction-dot ${extraction.data.status === 'FAILED' ? 'failed' : ''}`}
                aria-hidden="true"
              />
              <div>
                <strong>
                  {extraction.data.status === 'FAILED'
                    ? 'Soulprint update paused'
                    : extraction.data.status === 'RUNNING'
                      ? 'Reflecting on your conversation'
                      : 'Soulprint update queued'}
                </strong>
                <p>
                  {extraction.data.status === 'FAILED'
                    ? 'We could not analyze the latest message. It will be retried when you continue the conversation.'
                    : extraction.data.attempts > 1
                      ? `Trying again safely · attempt ${extraction.data.attempts}`
                      : 'New insights will appear here automatically.'}
                </p>
              </div>
            </div>
          )}
          {pendingCount > 0 && (
            <button className="pending-banner" onClick={() => setTab('review')}>
              <span className="pending-text">
                <strong>Review suggestions</strong>
                <small>Confirm, correct, or dismiss details your coach noticed.</small>
              </span>
              <span className="pending-count">{pendingCount}</span>
            </button>
          )}
          <div className="insight-row">
            <h2 className="insight-title">Explore your Soulprint</h2>
            <button className="text-link" onClick={goInsights}>
              Privacy & visibility <ArrowRight size={16} />
            </button>
          </div>
          <div className="category-grid">
            {primaryCategories.map((cat) => {
              const count = activeEntries.filter((entry) => entry.category === cat).length;
              const meta = categoryMeta[cat];
              return (
                <button
                  key={cat}
                  className="category-card"
                  onClick={() => {
                    setFilter(cat);
                    setTab('insights');
                  }}
                >
                  <span className="category-icon">{meta.icon}</span>
                  <span>
                    <strong>{meta.label}</strong>
                    <small>
                      {count} {count === 1 ? 'detail' : 'details'}
                    </small>
                  </span>
                  <ArrowRight size={16} className="category-arrow" />
                </button>
              );
            })}
          </div>
          <div className="action-row">
            <button className="button" onClick={goAdd}>
              Add a detail
            </button>
            <button className="button secondary" onClick={() => setTab('history')}>
              View history
            </button>
          </div>
          <div className="action-row">
            <button
              className="button ghost"
              disabled={
                act.isPending || ['PENDING', 'RUNNING'].includes(extraction.data?.status ?? '')
              }
              onClick={() => act.mutate({ path: '/soulprint/recalculate' })}
            >
              Refresh summary
            </button>
            <Link href="/app" className="button ghost">
              Talk about this with your coach
            </Link>
          </div>
        </div>
      )}
      {tab === 'review' && (
        <div className="insight-section">
          <div className="page-sub">
            <h2>Review suggestions</h2>
            <p className="muted">Your coach noticed something for you to review.</p>
          </div>
          <PendingReview
            entries={pending.data?.entries ?? []}
            reviewed={reviewed}
            busy={act.isPending}
            run={(path, body) =>
              act.mutate(
                { path, method: 'POST', body },
                {
                  onSuccess: markReviewed,
                },
              )
            }
          />
          <p className="muted review-footnote">
            You&apos;re always in control. Confirming helps your coach understand you; dismissing
            removes the suggestion.
          </p>
        </div>
      )}
      {tab === 'insights' && (
        <div className="insight-section">
          <div className="page-sub">
            <h2>All insights</h2>
            <p className="muted">You stay in control of every detail.</p>
          </div>
          <div className="filter-chips" role="tablist" aria-label="Filter by category">
            <button
              className={`chip ${filter === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilter('ALL')}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`chip ${filter === cat ? 'active' : ''}`}
                onClick={() => setFilter(cat)}
              >
                {categoryMeta[cat].label}
              </button>
            ))}
          </div>
          <div className="panel card">
            <button className="button add-toggle" onClick={() => setAddOpen((v) => !v)}>
              Add a detail {addOpen ? <ChevronUp size={16} /> : <Plus size={16} />}
            </button>
            {addOpen && (
              <form
                className="grid"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  act.mutate({
                    path: '/soulprint/entries',
                    body: {
                      category: f.get('category'),
                      key: f.get('key') || undefined,
                      value: f.get('value'),
                      visibility: f.get('visibility'),
                    },
                  });
                  e.currentTarget.reset();
                }}
              >
                <div className="field">
                  <label htmlFor="category">Category</label>
                  <select id="category" name="category">
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {categoryMeta[c].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="key">Label</label>
                  <input id="key" name="key" maxLength={100} />
                </div>
                <div className="field">
                  <label htmlFor="value">Insight</label>
                  <textarea id="value" name="value" required maxLength={2000} />
                </div>
                <div className="field">
                  <label htmlFor="visibility">Used for</label>
                  <select id="visibility" name="visibility">
                    <option value="PRIVATE">Private only</option>
                    <option value="GUIDANCE_ONLY">Coach guidance</option>
                    <option value="MATCHING_ALLOWED">Guidance and matching</option>
                  </select>
                </div>
                <button className="button" disabled={act.isPending}>
                  Add insight
                </button>
              </form>
            )}
          </div>
          {act.isError && (
            <p className="error" role="alert">
              {act.error.message}
            </p>
          )}
          {!filtered.length ? (
            <div className="panel card">
              <p className="muted">
                {filter === 'ALL'
                  ? 'Talk naturally with your Coach. Useful insights will appear here when enough context is available.'
                  : `No ${categoryMeta[filter].label.toLowerCase()} insights yet.`}
              </p>
            </div>
          ) : (
            <div className="grid">
              {filtered.map((entry) => (
                <SoulprintEntryCard
                  key={entry.id}
                  entry={entry}
                  busy={act.isPending}
                  run={(path, method = 'POST', body = {}) => act.mutate({ path, method, body })}
                />
              ))}
            </div>
          )}
          {entries.data.nextCursor && (
            <p className="muted">
              More than 100 insights exist. Refine or archive older items to keep this view focused.
            </p>
          )}
        </div>
      )}
      {tab === 'history' && (
        <div className="insight-section">
          <div className="page-sub">
            <h2>Recent changes</h2>
            <p className="muted">See how your Soulprint has evolved over time.</p>
          </div>
          {history.isError ? (
            <p className="error">History is temporarily unavailable.</p>
          ) : !history.data?.changes.length ? (
            <div className="panel card">
              <p className="muted">No changes yet.</p>
            </div>
          ) : (
            <div className="stack">
              {groupByDay(history.data.changes).map(([label, changes]) => (
                <div key={label}>
                  <h3 className="history-day">{label}</h3>
                  <div className="history-list">
                    {changes.map((change) => {
                      const before = changeValue(change, 'previousValue');
                      const after = changeValue(change, 'newValue');
                      const showDiff = before && after && before !== after;
                      return (
                        <article className="panel card" key={change.id}>
                          <div className="history-head">
                            <span className="history-badge">
                              {changeLabels[change.changeType] ??
                                change.changeType.replaceAll('_', ' ').toLowerCase()}
                            </span>
                            <small>
                              {change.changedBy === 'SYSTEM'
                                ? 'Updated by Soulmeet'
                                : 'Updated by you'}{' '}
                              · {new Date(change.createdAt).toLocaleTimeString()}
                            </small>
                          </div>
                          {showDiff && (
                            <div className="history-diff">
                              <div>
                                <small className="muted">Before</small>
                                <p>{before}</p>
                              </div>
                              <div>
                                <small className="muted">After</small>
                                <p>{after}</p>
                              </div>
                            </div>
                          )}
                          {change.reason && (
                            <p className="muted history-reason">{change.reason}</p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}