'use client';

import Link from 'next/link';
import Script from 'next/script';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { CountryCityFields } from '@/components/ui/country-city';

type Mode = 'login' | 'register';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(v: { client_id: string; callback: (r: { credential: string }) => void }): void;
          renderButton(el: HTMLElement, v: object): void;
        };
      };
    };
    AppleID?: {
      auth: {
        init(v: object): void;
        signIn(): Promise<{ authorization: { id_token: string } }>;
      };
    };
  }
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [maxBirthDate, setMaxBirthDate] = useState('');
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);
      setMaxBirthDate(
        new Date(Date.now() - 19 * 365.2425 * 86400000).toISOString().slice(0, 10),
      );
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const googleId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const appleId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID;

  const finish = useCallback(async () => {
    setTransitioning(true);
    const [profile, coachExists] = await Promise.all([
      fetch('/api/backend/profile', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
        .then((d) => d as { onboardingCompleted?: boolean } | null),
      fetch('/api/backend/coach', { cache: 'no-store' })
        .then((r) => r.ok)
        .catch(() => false),
      new Promise((resolve) => setTimeout(resolve, 900)),
    ]);
    if (!profile?.onboardingCompleted || !coachExists)
      return router.replace('/onboarding');
    const next = params.get('next');
    router.replace(next?.startsWith('/') ? next : '/app');
  }, [params, router]);

  const social = useCallback(
    async (provider: 'google' | 'apple', identityToken: string) => {
      setBusy(true);
      setError('');
      const r = await fetch(`/api/auth/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identityToken }),
      });
      const d = await r.json().catch(() => null);
      setBusy(false);
      if (!r.ok) {
        setError(d?.message ?? `${provider} sign-in failed.`);
        return;
      }
      await finish();
    },
    [finish],
  );

  useEffect(() => {
    if (!googleReady || !googleId || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: googleId,
      callback: (r) => void social('google', r.credential),
    });
    const el = document.getElementById('google-signin');
    if (el) {
      el.replaceChildren();
      window.google.accounts.id.renderButton(el, {
        theme: 'filled_black',
        size: 'large',
        width: 210,
        text: mode === 'login' ? 'signin_with' : 'signup_with',
      });
    }
  }, [googleReady, googleId, mode, social]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const data = Object.fromEntries(new FormData(e.currentTarget));
    if (mode === 'register' && data.password !== data.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    const payload =
      mode === 'register'
        ? {
            email: data.email,
            password: data.password,
            firstName: data.firstName,
            birthDate: data.birthDate,
            gender: data.gender,
            country: data.country,
            location: data.city,
            occupation: data.occupation || undefined,
          }
        : { email: data.email, password: data.password };

    const r = await fetch(`/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await r.json().catch(() => null);
    setBusy(false);

    if (!r.ok) {
      setError(body?.message ?? 'Unable to continue.');
      return;
    }

    if (mode === 'register') {
      router.replace('/onboarding');
    } else {
      await finish();
    }
  };

  const apple = async () => {
    if (!appleId || !window.AppleID) {
      setError('Apple Sign-In is not configured.');
      return;
    }
    try {
      window.AppleID.auth.init({
        clientId: appleId,
        scope: 'name email',
        redirectURI: `${location.origin}/login`,
        usePopup: true,
      });
      const result = await window.AppleID.auth.signIn();
      await social('apple', result.authorization.id_token);
    } catch {
      setError('Apple Sign-In was cancelled or failed.');
    }
  };

  if (!mounted) {
    return (
      <div className={`auth-form-loading ${mode}`} aria-hidden="true">
        <div className="auth-loading-line wide" />
        <div className="auth-loading-line" />
        {Array.from({ length: mode === 'register' ? 7 : 2 }, (_, index) => (
          <div className="auth-loading-field" key={index} />
        ))}
      </div>
    );
  }

  if (transitioning) {
    return (
      <div className="auth-success-transition" role="status" aria-live="polite" aria-busy="true">
        <div className="auth-success-mark" aria-hidden="true">
          <span />
        </div>
        <div>
          <div className="eyebrow">Login successful</div>
          <h1>Welcome to Soulmeet</h1>
          <p className="muted">Opening your private space...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setGoogleReady(true)}
      />
      <Script
        src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
        strategy="afterInteractive"
      />

      <form className="auth-form" onSubmit={submit}>
        <div className="eyebrow">Your private space</div>
        <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="muted">
          {mode === 'login'
            ? 'Continue where you left off.'
            : 'A thoughtful dating journey starts here.'}
        </p>

        <div className="socials">
          <div className="google-signin-slot">
            <div id="google-signin" aria-label={`${mode === 'login' ? 'Sign in' : 'Sign up'} with Google`} />
            {(!googleReady || !googleId) && (
              <button
                type="button"
                className="button secondary google-placeholder"
                disabled
                title={googleId ? 'Google Sign-In is loading' : 'Google Sign-In is not configured'}
              >
                Google
              </button>
            )}
          </div>
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => void apple()}
          >
            Apple
          </button>
        </div>

        <div className="divider">or use email</div>

        {mode === 'register' && (
          <>
            <div className="field">
              <label htmlFor="firstName">First name</label>
              <input id="firstName" name="firstName" required maxLength={80} />
            </div>
            <div className="grid">
              <div className="field">
                <label htmlFor="birthDate">Birth date</label>
                <input id="birthDate" name="birthDate" type="date" required max={maxBirthDate} />
              </div>
              <div className="field">
                <label htmlFor="gender">Gender</label>
                <select id="gender" name="gender" defaultValue="" required>
                  <option value="" disabled>
                    Choose
                  </option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="NON_GENDERED">Any</option>
                </select>
              </div>
            </div>
            <div className="grid">
              <CountryCityFields required />
            </div>
            <div className="field">
              <label htmlFor="occupation">Occupation (optional)</label>
              <input id="occupation" name="occupation" />
            </div>
          </>
        )}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={8}
            required
          />
        </div>

        {mode === 'register' && (
          <div className="field">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
        )}

        {mode === 'login' && (
          <Link href="/forgot-password" className="text-link">
            Forgot your password?
          </Link>
        )}

        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}

        <button className="button" disabled={busy}>
          {busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>

        <p className="muted">
          {mode === 'login' ? (
            <>
              New here? <Link href="/register">Create an account</Link>
            </>
          ) : (
            <>
              Already have an account? <Link href="/login">Sign in</Link>
            </>
          )}
        </p>
      </form>
    </>
  );
}
