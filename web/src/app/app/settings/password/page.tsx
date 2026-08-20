'use client';
import { useState } from 'react';
import { BackButton } from '@/components/ui/back-button';
import { api, json } from '@/services/api';
export default function Password() {
  const [state, setState] = useState('');
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState('Saving...');
    const f = new FormData(e.currentTarget);
    try {
      await api(
        '/auth/change-password',
        json('POST', { currentPassword: f.get('current'), newPassword: f.get('next') }),
      );
      setState('Password changed. Sign in again on your other devices.');
    } catch (x) {
      setState(x instanceof Error ? x.message : 'Unable to change password.');
    }
  };
  return (
    <div className="page">
      <BackButton fallback="/app/settings" />
      <div className="eyebrow">Security</div>
      <h1>Change password</h1>
      <form className="panel card auth-form" onSubmit={(e) => void submit(e)}>
        <div className="field">
          <label htmlFor="current">Current password</label>
          <input id="current" name="current" type="password" required />
        </div>
        <div className="field">
          <label htmlFor="next">New password</label>
          <input id="next" name="next" type="password" minLength={8} required />
        </div>
        {state && <p role="status">{state}</p>}
        <button className="button">Change password</button>
      </form>
    </div>
  );
}
