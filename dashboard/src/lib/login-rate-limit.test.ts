import { describe, expect, it, vi } from 'vitest';
import {
  clearLoginFailures,
  isLoginBlocked,
  LOGIN_LOCKOUT_MS,
  LOGIN_MAX_ATTEMPTS,
  recordLoginFailure,
} from './login-rate-limit';

describe('login rate limiter', () => {
  it('allows the first attempts and blocks after the maximum', () => {
    const key = '1.2.3.4|admin@example.com';
    expect(isLoginBlocked(key)).toBe(false);
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS - 1; i++) {
      const result = recordLoginFailure(key);
      expect(result.blocked).toBe(false);
    }
    const final = recordLoginFailure(key);
    expect(final.blocked).toBe(true);
    expect(isLoginBlocked(key)).toBe(true);
  });

  it('resets the window when the lockout expires', () => {
    vi.useFakeTimers();
    try {
      const key = '1.2.3.4|admin@example.com';
      for (let i = 0; i < LOGIN_MAX_ATTEMPTS; i++) recordLoginFailure(key);
      expect(isLoginBlocked(key)).toBe(true);
      vi.advanceTimersByTime(LOGIN_LOCKOUT_MS + 1);
      expect(isLoginBlocked(key)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears failures after a successful sign-in', () => {
    const key = '1.2.3.4|admin@example.com';
    recordLoginFailure(key);
    clearLoginFailures(key);
    expect(isLoginBlocked(key)).toBe(false);
    const result = recordLoginFailure(key);
    expect(result.remaining).toBe(LOGIN_MAX_ATTEMPTS - 1);
  });
});
