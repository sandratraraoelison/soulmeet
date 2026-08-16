'use client';

import { FormEvent, useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/toast';
import { useQueryClient } from '@tanstack/react-query';

export default function LoginPage() {
  const router = useRouter();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [email, setEmail] = useState('');

  // Restore a session that outlived its 15-minute access cookie.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch('/api/auth/silent-refresh', { method: 'POST' });
        if (active && response.ok) {
          queryClient.removeQueries({ queryKey: ['session'] });
          router.replace('/');
          return;
        }
      } catch {
        // Fall through to the sign-in form.
      }
      if (active) setRestoring(false);
    })();
    return () => { active = false; };
  }, [router, queryClient]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    const payload: Record<string, string> = { email: String(form.get('email') ?? ''), password: String(form.get('password') ?? '') };
    if (twoFactor && twoFactorToken) {
      payload.twoFactorToken = twoFactorToken;
      payload.code = String(form.get('code') ?? '');
      payload.email = email;
    }
    const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json().catch(() => null);
    setBusy(false);
    if (response.status === 200 && data?.requiresTwoFactor) {
      setTwoFactor(true);
      setTwoFactorToken(data.twoFactorToken ?? '');
      setEmail(String(form.get('email') ?? ''));
      return;
    }
    if (!response.ok) {
      const message = data?.message ?? 'Sign-in failed. Check your credentials and administrator access.';
      setError(message); notify('error', message);
      return;
    }
    queryClient.removeQueries({ queryKey: ['session'] });
    notify('success', 'Signed in successfully.');
    router.replace('/');
  }

  if (!mounted || restoring) return <main className="login" aria-busy="true" />;
  return (
    <main className="login">
      <form className="card login-card stack" onSubmit={submit}>
        <div>
          <div className="brand" style={{ color: 'var(--ink)', padding: 0 }}>Soul<span>meet</span></div>
          <h1>{twoFactor ? 'Two-factor verification' : 'Welcome back'}</h1>
          <p className="muted">{twoFactor ? 'Enter the code from your authenticator app or a recovery code.' : 'Sign in to the community operations dashboard.'}</p>
        </div>
        {!twoFactor ? (
          <>
            <label>Email<input className="input" style={{ width: '100%' }} name="email" type="email" autoComplete="email" required /></label>
            <label>Password<input className="input" style={{ width: '100%' }} name="password" type="password" autoComplete="current-password" minLength={8} required /></label>
          </>
        ) : (
          <label>Verification code<input className="input" style={{ width: '100%' }} name="code" inputMode="numeric" autoComplete="one-time-code" minLength={6} maxLength={20} required autoFocus /></label>
        )}
        {error && <div className="error" role="alert">{error}</div>}
        <button className="button primary" disabled={busy}>{busy ? 'Verifying…' : twoFactor ? 'Verify and sign in' : 'Sign in'}</button>
      </form>
    </main>
  );
}
