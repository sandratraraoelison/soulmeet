'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Heart, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Brand } from '@/components/brand';
import { CoachFacePicker } from '@/components/ui/coach-face-picker';
import { coachFace } from '@/features/coach/coach-faces';
import { ApiError, api, json } from '@/services/api';
import type { CoachPersonality, DatingGenderPreference } from '@/types';
import { COACH_TRAIT_OPTIONS, DATING_GENDER_OPTIONS, ONBOARDING_COACH_TRAITS } from '@/lib/constants';
const NAME_SUGGESTIONS = [
  'Lumina',
  'Milo',
  'Nova',
  'Sage',
  'Kai',
  'Ari',
  'Zara',
  'Orion',
  'Lyra',
  'Atlas',
  'Luna',
  'Phoenix',
  'Sora',
];
const traits = COACH_TRAIT_OPTIONS.filter((trait) =>
  ONBOARDING_COACH_TRAITS.includes(trait.value),
);
const stepMeta = [
  {
    icon: Heart,
    title: 'Who are you',
    highlight: 'interested in?',
    hint: 'This is your dating preference. It does not choose your Coach.',
  },
  {
    icon: Sparkles,
    title: 'Choose your',
    highlight: 'Coach',
    hint: 'Coach identity is separate from who you want to date.',
  },
  {
    icon: SlidersHorizontal,
    title: 'How should your Coach',
    highlight: 'feel?',
    hint: 'Pick the traits that make the Coach feel right to you. They can be refined later.',
  },
] as const;
export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [datingGenderPreference, setDating] = useState<DatingGenderPreference | null>(null);
  const [coachAppearance, setCoachAppearance] = useState('neutral-ai');
  const coachGender = coachFace(coachAppearance).gender;
  const [coachName, setName] = useState('Lumina');
  const [selectedTraits, setTraits] = useState<CoachPersonality[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const meta = stepMeta[step];
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      api('/profile/complete-onboarding', json('POST', {}))
        .then(() => router.replace('/app'))
        .catch(() => {
          setError('Unable to finish onboarding.');
          setReady(false);
          setBusy(false);
        });
    }, 1800);
    return () => clearTimeout(timer);
  }, [ready, router]);
  const finish = async () => {
    if (!datingGenderPreference || !coachName.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api('/profile', json('PUT', { interestedInGender: datingGenderPreference }));
      const coachInput = {
        name: coachName.trim(),
        gender: coachGender,
        traits: selectedTraits,
        appearance: coachAppearance,
      };
      try {
        await api('/coach', json('POST', coachInput));
      } catch (e) {
        if (!(e instanceof ApiError) || e.status !== 409) throw e;
        await api('/coach', json('PUT', coachInput));
      }
      setReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to finish onboarding.');
      setBusy(false);
    }
  };
  if (ready)
    return (
      <main className="auth-page">
        <section className="auth-art">
          <div>
            <Brand />
            <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: '3rem', maxWidth: 500 }}>
              A space to understand yourself and connect better.
            </h2>
          </div>
        </section>
        <section className="auth-card">
          <div className="auth-form panel card" style={{ textAlign: 'center' }}>
            <div className="coach-picker-strip" style={{ pointerEvents: 'none' }} />
            <div className="spinner" aria-hidden="true" />
            <h1 id="onboarding-title" style={{ fontSize: '1.9rem' }}>
              {coachName} is getting ready
            </h1>
            <p className="muted">Setting up your private space.</p>
          </div>
        </section>
      </main>
    );
  return (
    <main className="auth-page">
      <section className="auth-art">
        <div>
          <Brand />
          <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: '3rem', maxWidth: 500 }}>
            A space to understand yourself and connect better.
          </h2>
        </div>
      </section>
      <section className="auth-card">
        <section className="auth-form panel card" aria-labelledby="onboarding-title">
          <div className="eyebrow onboarding-eyebrow">
            Step {step + 1} of {stepMeta.length}
          </div>
          <div
            className="progress"
            role="progressbar"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={stepMeta.length}
          >
            <div
              style={{
                width: `${((step + 1) / stepMeta.length) * 100}%`,
                height: '100%',
                background: 'var(--gold)',
                borderRadius: 4,
              }}
            />
          </div>
          <div className="step-title">
            <span className="step-icon" aria-hidden="true">
              <meta.icon size={20} />
            </span>
            <h1 id="onboarding-title">
              {meta.title} <em className="title-gold">{meta.highlight}</em>
            </h1>
          </div>
          <p className="muted">{meta.hint}</p>
          {step === 0 && (
            <div className="choice-list" role="radiogroup" aria-label={meta.title}>
              {(DATING_GENDER_OPTIONS as [string, string][]).map(([id, label]) => (
                <Choice
                  key={id}
                  label={label}
                  selected={datingGenderPreference === id}
                  onSelect={() => setDating(id as DatingGenderPreference)}
                />
              ))}
            </div>
          )}
          {step === 1 && (
            <>
              <div className="field">
                <label htmlFor="coachName">Coach name</label>
                <input
                  id="coachName"
                  value={coachName}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  placeholder="Enter a coach name"
                />
              </div>
              <div className="field">
                <label htmlFor="coachSuggestions">Suggested names</label>
                <div className="chips" id="coachSuggestions">
                  {NAME_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className={`chip ${coachName === suggestion ? 'active' : ''}`}
                      onClick={() => setName(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
              <CoachFacePicker
                value={coachAppearance}
                onChange={(appearance) => setCoachAppearance(appearance)}
              />
            </>
          )}
          {step === 2 && (
            <div className="choice-list" role="group" aria-label={meta.title}>
              {traits.map((trait) => (
                <button
                  key={trait.value}
                  type="button"
                  role="checkbox"
                  aria-checked={selectedTraits.includes(trait.value)}
                  className={`trait-card ${selectedTraits.includes(trait.value) ? 'selected' : ''}`}
                  onClick={() =>
                    setTraits((v) =>
                      v.includes(trait.value) ? v.filter((x) => x !== trait.value) : [...v, trait.value],
                    )
                  }
                >
                  <span>
                    <strong>{trait.label}</strong>
                    <small>{trait.description}</small>
                  </span>
                  <span className="trait-check" aria-hidden="true">
                    <Check size={15} strokeWidth={3} />
                  </span>
                </button>
              ))}
            </div>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="action-row">
            {step > 0 && (
              <button className="button secondary" onClick={() => setStep((v) => v - 1)}>
                <ArrowLeft size={18} />
                Back
              </button>
            )}
            <button
              className="button button-gold"
              disabled={
                busy ||
                (step === 0 && !datingGenderPreference) ||
                (step === 1 && !coachName.trim())
              }
              onClick={() => (step < 2 ? setStep((v) => v + 1) : void finish())}
            >
              {busy ? 'Setting things up...' : step < 2 ? 'Continue' : 'Create my coach'}
              {!busy && <ArrowRight size={18} />}
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}
function Choice({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={`choice ${selected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <span>{label}</span>
      <span className="choice-check" aria-hidden="true">
        <Check size={16} strokeWidth={3} />
      </span>
    </button>
  );
}
