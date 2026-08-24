'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Heart, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Brand } from '@/components/brand';
import { CoachFacePicker } from '@/components/ui/coach-face-picker';
import { CountryCityFields } from '@/components/ui/country-city';
import { coachFace } from '@/features/coach/coach-faces';
import { ApiError, api, json } from '@/services/api';
import type { CoachPersonality, DatingGenderPreference } from '@/types';
import { COACH_TRAIT_OPTIONS, DATING_GENDER_OPTIONS, ONBOARDING_COACH_TRAITS, PROFILE_GENDER_OPTIONS } from '@/lib/constants';
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
const profileStep = {
  icon: Heart,
  title: 'Tell us about',
  highlight: 'yourself',
  hint: 'Google does not share these details. They are required to create your private profile.',
} as const;
export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [datingGenderPreference, setDating] = useState<DatingGenderPreference | null>(null);
  const [matchingConsent, setMatchingConsent] = useState(false);
  const [coachAppearance, setCoachAppearance] = useState('lumen');
  const coachGender = coachFace(coachAppearance).gender;
  const [coachName, setName] = useState('Lumen');
  const [selectedTraits, setTraits] = useState<CoachPersonality[]>(['EMPATHETIC', 'SOFT', 'THERAPIST']);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [needsProfile, setNeedsProfile] = useState<boolean | null>(null);
  const [profileInput, setProfileInput] = useState<Record<string, string> | null>(null);
  const [maxBirthDate] = useState(() =>
    new Date(Date.now() - 19 * 365.2425 * 86400000).toISOString().slice(0, 10),
  );
  const profileForm = useRef<HTMLFormElement>(null);
  const steps = needsProfile ? [profileStep, ...stepMeta] : stepMeta;
  const meta = steps[step];
  const contentStep = step - (needsProfile ? 1 : 0);
  useEffect(() => {
    api('/profile')
      .then(() => setNeedsProfile(false))
      .catch((error) => {
        if (error instanceof ApiError && error.status === 404) setNeedsProfile(true);
        else {
          setError(error instanceof Error ? error.message : 'Unable to load your profile.');
          setNeedsProfile(false);
        }
      });
  }, []);
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
      await api('/profile', json('PUT', {
        ...(profileInput ?? {}),
        ...(needsProfile ? { sexualOrientation: 'PREFER_NOT_TO_SAY' } : {}),
        interestedInGender: datingGenderPreference,
      }));
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
      await api('/users/matches/activate', json('POST', {}));
      setReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to finish onboarding.');
      setBusy(false);
    }
  };
  const continueOnboarding = () => {
    if (needsProfile && step === 0) {
      const form = profileForm.current;
      if (!form?.reportValidity()) return;
      setProfileInput(Object.fromEntries(new FormData(form)) as Record<string, string>);
    }
    setStep((value) => value + 1);
  };
  if (needsProfile === null)
    return <main className="auth-page" aria-busy="true" />;
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
            Step {step + 1} of {steps.length}
          </div>
          <div
            className="progress"
            role="progressbar"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={steps.length}
          >
            <div
              style={{
                width: `${((step + 1) / steps.length) * 100}%`,
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
          {needsProfile && step === 0 && (
            <form ref={profileForm} className="grid" onSubmit={(event) => event.preventDefault()}>
              <div className="field">
                <label htmlFor="firstName">First name</label>
                <input id="firstName" name="firstName" required maxLength={80} />
              </div>
              <div className="field">
                <label htmlFor="birthDate">Birth date</label>
                <input id="birthDate" name="birthDate" type="date" required max={maxBirthDate} />
              </div>
              <div className="field">
                <label htmlFor="gender">Gender</label>
                <select id="gender" name="gender" required defaultValue="">
                  <option value="" disabled>Choose</option>
                  {PROFILE_GENDER_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
              </div>
              <CountryCityFields required />
            </form>
          )}
          {contentStep === 0 && (
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
          {contentStep === 1 && (
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
                onChange={(appearance) => { const option = coachFace(appearance); setCoachAppearance(appearance); setName(option.name); setTraits(option.defaultTraits); }}
              />
            </>
          )}
          {contentStep === 2 && (
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
              <label className="trait-card matching-consent-card">
                <input type="checkbox" checked={matchingConsent} onChange={(event) => setMatchingConsent(event.target.checked)} />
                <span className="matching-consent-copy">
                  <strong>Let my coach look for introductions</strong>
                  <small>I allow Soulmeet to use non-sensitive details I share now and later for matching. I can withdraw this in settings.</small>
                </span>
              </label>
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
                (contentStep === 0 && !datingGenderPreference) ||
                (contentStep === 1 && !coachName.trim())
                || (contentStep === 2 && !matchingConsent)
              }
              onClick={() => (step < steps.length - 1 ? continueOnboarding() : void finish())}
            >
              {busy ? 'Setting things up...' : step < steps.length - 1 ? 'Continue' : 'Create my coach'}
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
