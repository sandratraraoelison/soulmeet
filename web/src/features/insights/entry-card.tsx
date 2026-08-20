'use client';
import { useState } from 'react';
import { ConfirmButton } from '@/components/ui/confirm-button';
import type { SoulprintEntry, SoulprintVisibility } from '@/types';

export const displaySoulprintValue = (input: unknown): string =>
  typeof input === 'string'
    ? input
    : Array.isArray(input)
      ? input.map(displaySoulprintValue).join(', ')
      : input && typeof input === 'object'
        ? Object.entries(input)
            .map(([key, value]) => `${key}: ${displaySoulprintValue(value)}`)
            .join(' · ')
        : String(input ?? '');

const SOURCE_LABELS: Record<string, string> = {
  USER_PROFILE: 'Profile',
  USER_DECLARED: 'Shared by you',
  USER_CONFIRMED: 'Confirmed by you',
  AI_INFERRED: 'Coach conversation',
  MANUAL_USER_ENTRY: 'Added by you',
  SYSTEM_MIGRATION: 'Soulmeet',
};
const VISIBILITY_META: Record<SoulprintVisibility, { label: string }> = {
  PRIVATE: { label: 'Private' },
  GUIDANCE_ONLY: { label: 'Coach only' },
  MATCHING_ALLOWED: { label: 'Coach and matching' },
};

const sourceLabel = (source: string) => SOURCE_LABELS[source] ?? source.replaceAll('_', ' ');

function freshnessLabel(entry: SoulprintEntry) {
  const observedAt = entry.lastObservedAt ?? entry.updatedAt;
  if (!observedAt) return '';
  const ageDays = Math.max(
    0,
    Math.floor((Date.now() - new Date(observedAt).getTime()) / 86_400_000),
  );
  return ageDays < 30
    ? 'Recently observed'
    : ageDays < 180
      ? 'Observed in recent months'
      : 'May need reconfirmation';
}

export function SoulprintEntryCard({
  entry,
  busy,
  run,
}: {
  entry: SoulprintEntry;
  busy: boolean;
  run: (path: string, method?: string, body?: unknown) => void;
}) {
  const [editing, setEditing] = useState<null | 'edit' | 'correct'>(null);
  const [draft, setDraft] = useState('');
  const startEditing = (mode: 'edit' | 'correct') => {
    setEditing(mode);
    setDraft(displaySoulprintValue(entry.value));
  };
  const save = () => {
    const value = draft.trim();
    if (!value) return;
    if (editing === 'correct')
      run(`/soulprint/entries/${entry.id}/confirm`, 'POST', { correctedValue: value });
    else run(`/soulprint/entries/${entry.id}`, 'PATCH', { value });
    setEditing(null);
  };
  return (
    <article className="panel card">
      <div className="eyebrow">{entry.category.replaceAll('_', ' ')}</div>
      <h3>{entry.key ?? 'A detail about you'}</h3>
      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="field">
            <textarea
              aria-label="Edit insight"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={2000}
            />
          </div>
          <div className="action-row">
            <button className="button" disabled={busy || !draft.trim()}>
              Save
            </button>
            <button
              type="button"
              className="button ghost"
              disabled={busy}
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <p>{displaySoulprintValue(entry.value)}</p>
          <div className="entry-pills">
            <span className="entry-pill muted">
              <span className="entry-dot secondary" aria-hidden="true" />
              {sourceLabel(entry.source)}
            </span>
            <span className="entry-pill tinted">
              <span className="entry-dot pink" aria-hidden="true" />
              {VISIBILITY_META[entry.visibility].label}
            </span>
          </div>
          {freshnessLabel(entry) && <small className="entry-fresh">{freshnessLabel(entry)}</small>}
          {entry.evidence?.length ? (
            <blockquote>
              {entry.evidence.map((item) => (
                <p key={item.id}>“{item.excerpt ?? 'Based on a previous interaction'}”</p>
              ))}
            </blockquote>
          ) : null}
          <div className="field">
            <label htmlFor={`visibility-${entry.id}`}>Privacy</label>
            <select
              id={`visibility-${entry.id}`}
              value={entry.visibility}
              disabled={busy}
              onChange={(event) =>
                run(`/soulprint/entries/${entry.id}/visibility`, 'PATCH', {
                  visibility: event.target.value as SoulprintVisibility,
                })
              }
            >
              <option value="PRIVATE">Private only</option>
              <option value="GUIDANCE_ONLY">Coach guidance</option>
              <option value="MATCHING_ALLOWED">Guidance and matching</option>
            </select>
          </div>
          {entry.status === 'PENDING_CONFIRMATION' && (
            <div className="action-row">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => run(`/soulprint/entries/${entry.id}/reject`)}
              >
                Not right
              </button>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => startEditing('correct')}
              >
                Correct
              </button>
              <button
                className="button"
                disabled={busy}
                onClick={() => run(`/soulprint/entries/${entry.id}/confirm`)}
              >
                Confirm
              </button>
            </div>
          )}
          <div className="action-row">
            <button className="button ghost" disabled={busy} onClick={() => startEditing('edit')}>
              Edit
            </button>
            <ConfirmButton
              label="Delete"
              disabled={busy}
              onConfirm={() => run(`/soulprint/entries/${entry.id}`, 'DELETE')}
            />
          </div>
        </>
      )}
    </article>
  );
}