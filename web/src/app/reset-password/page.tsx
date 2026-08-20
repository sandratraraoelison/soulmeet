'use client';
import Link from 'next/link';
import { useState } from 'react';
import { api, json } from '@/services/api';
export default function Reset() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api(
        '/auth/reset-password',
        json('POST', {
          email: f.get('email'),
          code: f.get('code'),
          newPassword: f.get('password'),
        }),
      );
      setDone(true);
    } catch (x) {
      setError(x instanceof Error ? x.message : 'Unable to reset password.');
    }
  };
  return (
    <main className="auth-card" style={{ minHeight: '100vh' }}>
      <form className="auth-form panel card" onSubmit={(e) => void submit(e)}>
        <div className="eyebrow">Account recovery</div>
        <h1>Choose a new password</h1>
        {[
          ['email', 'Email'],
          ['code', 'Verification code'],
          ['password', 'New password'],
        ].map(([name, label]) => (
          <div className="field" key={name}>
            <label htmlFor={name}>{label}</label>
            <input
              id={name}
              name={name}
              type={name === 'password' ? 'password' : name === 'email' ? 'email' : 'text'}
              minLength={name === 'password' ? 8 : undefined}
              required
            />
          </div>
        ))}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {done ? (
          <Link className="button" href="/login">
            Sign in
          </Link>
        ) : (
          <button className="button">Save new password</button>
        )}
      </form>
    </main>
  );
}
