'use client';
import Link from 'next/link';
import { useState } from 'react';
import { api, json } from '@/services/api';
export default function Forgot() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const email = String(new FormData(e.currentTarget).get('email') ?? '');
    try {
      await api('/auth/forgot-password', json('POST', { email }));
      setSent(true);
    } catch (x) {
      setError(x instanceof Error ? x.message : 'Unable to send code.');
    }
  };
  return (
    <main className="auth-card" style={{ minHeight: '100vh' }}>
      <form className="auth-form panel card" onSubmit={(e) => void submit(e)}>
        <div className="eyebrow">Account recovery</div>
        <h1>Reset your password</h1>
        <p className="muted">
          We will send a short verification code if this account can be recovered.
        </p>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required />
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {sent ? (
          <Link className="button" href="/reset-password">
            Enter verification code
          </Link>
        ) : (
          <button className="button">Send code</button>
        )}
        <Link href="/login">Back to sign in</Link>
      </form>
    </main>
  );
}
