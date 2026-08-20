'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { GrowthGoal, GrowthOverview, GrowthPreference } from '@/types';
import { Failure, Loading } from '@/components/remote';
import { growthService } from '@/services/growth';
import { useGenericMutation } from '@/lib/use-generic-mutation';

export default function Growth() {
  const [message, setMessage] = useState('');
  const q = useQuery<GrowthOverview>({ queryKey: ['growth'], queryFn: growthService.overview });
  const change = useGenericMutation([['growth']], { onSuccess: () => setMessage('Saved.') });
  if (q.isLoading)
    return (
      <div className="page">
        <Loading />
      </div>
    );
  if (q.isError || !q.data)
    return (
      <div className="page">
        <Failure retry={() => void q.refetch()} />
      </div>
    );
  const progress = (g: GrowthGoal) => Math.round((g.completedSteps / g.targetSteps) * 100);
  const savePreferences = (preferences: GrowthPreference) =>
    change.mutate({ path: '/growth/preferences', method: 'PATCH', body: preferences });
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">Growth</div>
          <h1>Small steps, meaningful change.</h1>
        </div>
        {q.data.streak ? <strong>{q.data.streak} day rhythm</strong> : null}
      </header>
      {message && <p role="status">{message}</p>}
      {change.isError && (
        <p className="error" role="alert">
          {change.error.message}
        </p>
      )}
      <div className="growth">
        <section className="growth-panel">
          <h2>Create a personal goal</h2>
          <form
            className="growth-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              change.mutate({
                path: '/growth/goals',
                body: {
                  title: f.get('title'),
                  description: f.get('description') || undefined,
                  targetSteps: Number(f.get('targetSteps')),
                },
              });
              e.currentTarget.reset();
            }}
          >
            <input
              aria-label="Goal"
              name="title"
              placeholder="What do you want to grow?"
              required
              minLength={2}
              maxLength={120}
            />
            <input
              aria-label="Number of steps"
              name="targetSteps"
              type="number"
              min="1"
              max="20"
              defaultValue="7"
              placeholder="Steps"
              required
            />
            <button className="button" disabled={change.isPending}>
              Create
            </button>
            <input
              className="wide"
              aria-label="Why it matters"
              name="description"
              placeholder="Why it matters (optional)"
              maxLength={500}
            />
          </form>
        </section>
        <section>
          <h2>Current focus</h2>
          <div className="growth-grid">
            {q.data.activeGoals.map((g) => (
              <article className="growth-panel" key={g.id}>
                <div className="growth-head">
                  <h3>{g.title}</h3>
                  <strong className="meta">{progress(g)}%</strong>
                </div>
                {g.description && <p className="meta">{g.description}</p>}
                <progress value={g.completedSteps} max={g.targetSteps} />
                <div className="growth-actions">
                  <button
                    className="button"
                    disabled={change.isPending || g.completedSteps >= g.targetSteps}
                    onClick={() =>
                      change.mutate({
                        path: `/growth/goals/${g.id}/progress`,
                        method: 'PATCH',
                        body: { completedSteps: g.completedSteps + 1, version: g.version },
                      })
                    }
                  >
                    Complete a step
                  </button>
                  <button
                    className="button secondary"
                    disabled={change.isPending}
                    onClick={() => change.mutate({ path: `/growth/goals/${g.id}`, method: 'DELETE' })}
                  >
                    Archive
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section>
          <h2>Suggested for you</h2>
          <div className="growth-grid">
            {q.data.suggestedGoals.map((g) => (
              <article className="growth-row" key={g.id}>
                <div>
                  <h3>{g.title}</h3>
                  {g.description && <p className="meta">{g.description}</p>}
                </div>
                <div className="growth-actions">
                  <button
                    className="button secondary"
                    disabled={change.isPending}
                    onClick={() => change.mutate({ path: `/growth/goals/${g.id}`, method: 'DELETE' })}
                  >
                    Not now
                  </button>
                  <button
                    className="button"
                    disabled={change.isPending}
                    onClick={() => change.mutate({ path: `/growth/goals/${g.id}/accept` })}
                  >
                    Accept
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
        {q.data.todayExercise && (
          <section className="growth-panel">
            <div className="eyebrow">Today&apos;s exercise</div>
            <h3>{q.data.todayExercise.title}</h3>
            <p className="meta">{q.data.todayExercise.description}</p>
            <div className="growth-actions">
              <button
                className="button"
                disabled={change.isPending || !!q.data.todayExercise.completedAt}
                onClick={() =>
                  change.mutate({ path: `/growth/exercises/${q.data!.todayExercise!.id}/complete` })
                }
              >
                {q.data.todayExercise.completedAt ? 'Completed' : 'Mark complete'}
              </button>
            </div>
          </section>
        )}
        <section className="growth-panel">
          <h2>Weekly check-in</h2>
          <form
            className="growth-form column"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              change.mutate({
                path: '/growth/check-ins',
                body: { mood: Number(f.get('mood')), reflection: f.get('reflection') || undefined },
              });
            }}
          >
            <div className="field">
              <label htmlFor="mood">How are you feeling? (1–5)</label>
              <input
                id="mood"
                name="mood"
                type="range"
                min="1"
                max="5"
                defaultValue={q.data.weeklyCheckIn?.mood ?? 3}
              />
            </div>
            <textarea
              aria-label="Reflection"
              name="reflection"
              maxLength={1000}
              placeholder="Reflection (optional)"
              defaultValue={q.data.weeklyCheckIn?.reflection ?? ''}
            />
            <button className="button" disabled={change.isPending}>
              Save check-in
            </button>
          </form>
        </section>
        <section>
          <h2>Guided paths</h2>
          <div className="growth-grid">
            {q.data.paths.map((path) => (
              <article className="growth-panel" key={path.key}>
                <div className="growth-head">
                  <h3>{path.title}</h3>
                  {path.enrollment && (
                    <span className="meta">
                      {path.enrollment.completedUnits}/{path.enrollment.totalUnits}
                    </span>
                  )}
                </div>
                <p className="meta">{path.description}</p>
                {path.enrollment ? (
                  <progress value={path.enrollment.completedUnits} max={path.enrollment.totalUnits} />
                ) : (
                  <div className="growth-actions">
                    <button
                      className="button"
                      disabled={change.isPending}
                      onClick={() =>
                        change.mutate({ path: '/growth/paths/enroll', body: { pathKey: path.key } })
                      }
                    >
                      Start path
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
        <section className="growth-panel">
          <h2>Reminders and privacy</h2>
          <div className="growth-toggles">
            {(
              [
                ['remindersEnabled', 'Growth reminders'],
                ['gentleStreaks', 'Use gentle streaks'],
                ['analyticsConsent', 'Allow growth analytics'],
              ] as const
            ).map(([key, label]) => (
              <label className="toggle" key={key}>
                <input
                  type="checkbox"
                  checked={q.data.preferences[key]}
                  onChange={(e) => savePreferences({ ...q.data.preferences, [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
          </div>
        </section>
        {!!q.data.moodTrend.length && (
          <section className="growth-panel">
            <h2>Mood trend</h2>
            <div className="growth-bars" style={{ height: 90 }}>
              {q.data.moodTrend.map((item) => (
                <div
                  key={item.id}
                  title={`${item.mood}/5 · ${new Date(item.updatedAt).toLocaleDateString()}`}
                  style={{
                    height: `${item.mood * 20}%`,
                    flex: 1,
                    minWidth: 14,
                    maxWidth: 60,
                    borderRadius: '8px 8px 0 0',
                    background: 'var(--pink)',
                  }}
                />
              ))}
            </div>
            <p className="meta">A private view of your recent weekly check-ins.</p>
          </section>
        )}
        {!!q.data.recentActivity.length && (
          <section>
            <h2>Recent activity</h2>
            <div className="growth-grid">
              {q.data.recentActivity.map((item) => (
                <article className="growth-row" key={item.id}>
                  <strong>{item.title}</strong>
                  <span className="meta">{new Date(item.createdAt).toLocaleDateString()}</span>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}