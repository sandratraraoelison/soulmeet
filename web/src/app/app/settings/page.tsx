'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Failure, Loading } from '@/components/remote';
import { FormField } from '@/components/ui/form-controls';
import { PageHeader } from '@/components/ui/page-header';
import { api, json } from '@/services/api';
import { consentService } from '@/services/consent';
import { consentKey } from '@/components/consent-gate';

type Preferences = {
  newMessages: boolean;
  coachReflections: boolean;
  soulprintConfirmations: boolean;
  growthReminders: boolean;
  timezone: string;
  quietHoursEnabled: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
};
const notificationKeys = [
  'newMessages',
  'coachReflections',
  'soulprintConfirmations',
  'growthReminders',
] as const;
const hours = Array.from({ length: 24 }, (_, hour) => hour);
const formatHour = (hour: number) => `${String(hour).padStart(2, '0')}:00`;
const labelFor = (key: string) =>
  key.replace(/([A-Z])/g, ' $1').replace(/^./, (character) => character.toUpperCase());
const visualStyles = [
  { id: 'soft', label: 'Soft', description: 'Warm, gentle and expressive.', swatches: ['#9B4F7F', '#D9A7B8', '#8B7AD8'] },
  { id: 'balanced', label: 'Balanced', description: 'Welcoming, calm and universal.', swatches: ['#6D5BD0', '#C9869E', '#4F9C96'] },
  { id: 'bold', label: 'Bold', description: 'Structured, vivid and confident.', swatches: ['#176B77', '#E09F3E', '#D05A75'] },
] as const;
export type VisualStyle = (typeof visualStyles)[number]['id'];

export default function Settings() {
  const queryClient = useQueryClient();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [visualStyle, setVisualStyle] = useState<VisualStyle>('balanced');
  const [confirmTurnOff, setConfirmTurnOff] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setTheme(localStorage.getItem('sm_theme') === 'light' ? 'light' : 'dark');
      const stored = localStorage.getItem('sm_style');
      setVisualStyle(stored === 'soft' || stored === 'bold' ? stored : 'balanced');
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const preferences = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<Preferences>('/notifications/preferences'),
  });
  const consent = useQuery({ queryKey: consentKey, queryFn: consentService.get });
  const saveConsent = useMutation({ mutationFn: consentService.update, onSuccess: (next) => queryClient.setQueryData(consentKey, next) });
  const turnOffConsent = (remove: boolean) => {
    saveConsent.mutate(false, { onSuccess: async () => { setConfirmTurnOff(false); if (remove) { await consentService.removeInsights(); await queryClient.invalidateQueries({ queryKey: ['soulprint'] }); } } });
  };
  const save = useMutation({
    mutationFn: (next: Preferences) =>
      api<Preferences>('/notifications/preferences', json('PATCH', next)),
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData<Preferences>(['notifications']);
      queryClient.setQueryData(['notifications'], next);
      return { previous };
    },
    onError: (_error, _next, context) =>
      queryClient.setQueryData(['notifications'], context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const chooseTheme = (next: 'dark' | 'light') => {
    setTheme(next);
    localStorage.setItem('sm_theme', next);
    document.documentElement.dataset.theme = next;
  };
  const chooseStyle = (next: VisualStyle) => {
    setVisualStyle(next);
    localStorage.setItem('sm_style', next);
    document.documentElement.setAttribute('data-style', next);
  };
  if (preferences.isLoading)
    return (
      <div className="page">
        <Loading />
      </div>
    );
  if (preferences.isError || !preferences.data)
    return (
      <div className="page">
        <Failure retry={() => void preferences.refetch()} />
      </div>
    );
  const data = preferences.data;
  return (
    <div className="page">
      <PageHeader eyebrow="Settings" title="Privacy, security, and preferences" />
      <section className="panel card stack">
        <h2>Appearance</h2>
        <p className="muted">Choose how Soulmeet looks on this device.</p>
        <div className="action-row">
          <button
            className={`button ${theme === 'dark' ? '' : 'secondary'}`}
            onClick={() => chooseTheme('dark')}
          >
            Dark
          </button>
          <button
            className={`button ${theme === 'light' ? '' : 'secondary'}`}
            onClick={() => chooseTheme('light')}
          >
            Light
          </button>
        </div>
        <h3 className="settings-subtitle">Visual style</h3>
        <p className="muted">Choose an atmosphere, independent of gender.</p>
        <div className="style-grid">
          {visualStyles.map((option) => (
            <button
              type="button"
              key={option.id}
              className={`style-card ${visualStyle === option.id ? 'style-card-active' : ''}`}
              onClick={() => chooseStyle(option.id)}
            >
              <span className="style-swatches" aria-hidden>
                {option.swatches.map((color, index) => (
                  <span
                    key={color}
                    className="style-swatch"
                    style={{ background: color, marginLeft: index ? -9 : 0 }}
                  />
                ))}
              </span>
              <span className="style-card-label">
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
              <span
                className={`style-card-radio ${visualStyle === option.id ? 'checked' : ''}`}
                aria-hidden
              />
            </button>
          ))}
        </div>
      </section>
      <section className="panel card stack section-gap">
        <h2>Notifications</h2>
        {notificationKeys.map((key) => (
          <label className="setting-row" key={key}>
            <span>{labelFor(key)}</span>
            <input
              type="checkbox"
              checked={data[key]}
              onChange={(event) => save.mutate({ ...data, [key]: event.target.checked })}
            />
          </label>
        ))}
        <label className="setting-row">
          <span>Quiet hours</span>
          <input
            type="checkbox"
            checked={data.quietHoursEnabled}
            onChange={(event) =>
              save.mutate({ ...data, quietHoursEnabled: event.target.checked })
            }
          />
        </label>
        {data.quietHoursEnabled && (
          <div className="action-row">
            <div className="field">
              <label htmlFor="quietHoursStart">From</label>
              <select
                id="quietHoursStart"
                value={data.quietHoursStart}
                onChange={(event) =>
                  save.mutate({ ...data, quietHoursStart: Number(event.target.value) })
                }
              >
                {hours.map((hour) => (
                  <option key={hour} value={hour}>
                    {formatHour(hour)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="quietHoursEnd">Until</label>
              <select
                id="quietHoursEnd"
                value={data.quietHoursEnd}
                onChange={(event) =>
                  save.mutate({ ...data, quietHoursEnd: Number(event.target.value) })
                }
              >
                {hours.map((hour) => (
                  <option key={hour} value={hour}>
                    {formatHour(hour)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        <form
          className="action-row"
          key={data.timezone}
          onSubmit={(event) => {
            event.preventDefault();
            const timezone = String(new FormData(event.currentTarget).get('timezone'));
            save.mutate({ ...data, timezone });
          }}
        >
          <FormField
            id="timezone"
            name="timezone"
            label="Timezone"
            defaultValue={data.timezone}
            required
            maxLength={80}
          />
          <button className="button secondary" disabled={save.isPending}>
            Save timezone
          </button>
        </form>
        {save.isError && (
          <p className="error" role="alert">
            {save.error.message}
          </p>
        )}
      </section>
      <section className="panel card section-gap privacy-settings-card">
        <div className="privacy-settings-head"><div><div className="eyebrow">Your choice</div><h2>AI &amp; Soulprint Privacy</h2><p className="muted">Control whether your conversations can help your Soulprint become more accurate.</p></div><span className={`privacy-status ${consent.data?.conversationAnalysisAllowed ? 'active' : ''}`}>{consent.isPending ? 'Loading…' : consent.data?.conversationAnalysisAllowed ? 'Enabled' : 'Disabled'}</span></div>
        <label className="privacy-toggle-row">
          <span className="privacy-toggle-copy"><strong>Allow AI to learn from my conversations</strong><small>When enabled, Soulmeet can analyze relevant patterns from your new conversations to improve your Soulprint.</small></span>
          <input className="privacy-toggle-input" type="checkbox" disabled={consent.isPending || saveConsent.isPending} checked={consent.data?.conversationAnalysisAllowed ?? false} onChange={(event) => event.target.checked ? saveConsent.mutate(true) : setConfirmTurnOff(true)} />
          <span className="privacy-toggle" aria-hidden><span /></span>
        </label>
        {consent.data?.lastChangedAt ? <p className="privacy-date">Last changed <strong>{new Date(consent.data.lastChangedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong></p> : null}
        {consent.isError || saveConsent.isError ? <p className="error" role="alert">Unable to update this privacy setting. Please try again.</p> : null}
      </section>
      {confirmTurnOff ? <div className="consent-overlay" role="presentation"><div className="consent-dialog" role="alertdialog" aria-modal="true" aria-labelledby="turn-off-title"><h2 id="turn-off-title">Turn off conversation analysis?</h2><p>Soulmeet will stop using your new conversations to improve your Soulprint. You can also remove insights previously generated from your conversations.</p><div className="action-row"><button className="button secondary" disabled={saveConsent.isPending} onClick={() => turnOffConsent(false)}>Stop future analysis only</button><button className="button danger" disabled={saveConsent.isPending} onClick={() => turnOffConsent(true)}>Stop and remove conversation-based insights</button><button className="button secondary" disabled={saveConsent.isPending} onClick={() => setConfirmTurnOff(false)}>Cancel</button></div></div></div> : null}
      <section className="panel card stack section-gap">
        <h2>Account</h2>
        <Link className="button secondary" href="/app/settings/password">
          Change password
        </Link>
        <Link className="button secondary" href="/app/profile/coach">
          Customize Coach
        </Link>
        <p className="muted">
          Account deletion requires a self-service backend endpoint. It is not simulated on the web.
        </p>
        <a href="mailto:support@soulmeet.app" className="button secondary">
          Contact support about deletion
        </a>
      </section>
      <section className="panel card section-gap">
        <h2>Support</h2>
        <p className="muted">Get help, share feedback, or review important information.</p>
        <div className="settings-links">
          <a
            className="settings-link"
            href="https://soulmeet.app/help"
            target="_blank"
            rel="noreferrer"
          >
            <span>
              <strong>Help center</strong>
              <small>Find answers and learn how Soulmeet works.</small>
            </span>
            <ArrowRight size={16} />
          </a>
          <a
            className="settings-link"
            href="mailto:support@soulmeet.app?subject=Soulmeet%20support%20-%20v1.0.0"
          >
            <span>
              <strong>Contact us</strong>
              <small>Talk directly with the Soulmeet support team.</small>
            </span>
            <ArrowRight size={16} />
          </a>
          <a
            className="settings-link"
            href="mailto:support@soulmeet.app?subject=Soulmeet%20problem%20report%20-%20v1.0.0&body=Please%20describe%20the%20problem%20and%20the%20steps%20to%20reproduce%20it%3A%0A%0A"
          >
            <span>
              <strong>Report a problem</strong>
              <small>Tell us what happened so we can investigate.</small>
            </span>
            <ArrowRight size={16} />
          </a>
          <Link className="settings-link" href="/privacy">
            <span>
              <strong>Privacy policy</strong>
              <small>How we handle your data.</small>
            </span>
            <ArrowRight size={16} />
          </Link>
          <Link className="settings-link" href="/terms">
            <span>
              <strong>Terms of use</strong>
              <small>Rules for using Soulmeet.</small>
            </span>
            <ArrowRight size={16} />
          </Link>
        </div>
        <p className="muted">App version 1.0.0</p>
      </section>
    </div>
  );
}
