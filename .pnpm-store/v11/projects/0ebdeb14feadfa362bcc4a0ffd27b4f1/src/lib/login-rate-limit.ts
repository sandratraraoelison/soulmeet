/**
 * In-memory brute-force protection for the dashboard login route.
 * Keyed by IP + email so a distributed attempt on one account still trips
 * the per-account window, and a single attacker cannot hammer many accounts.
 * Process-local by design: the dashboard runs as a single Node instance.
 */

export const LOGIN_WINDOW_MS = 15 * 60_000;
export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_MS = 15 * 60_000;

type Entry = {
  firstAttemptAt: number;
  attempts: number;
  lockedUntil: number | null;
};

const entries = new Map<string, Entry>();

export function isLoginBlocked(key: string): boolean {
  const entry = entries.get(key);
  if (!entry) return false;
  if (entry.lockedUntil && entry.lockedUntil > Date.now()) return true;
  if (entry.lockedUntil && entry.lockedUntil <= Date.now()) {
    entries.delete(key);
    return false;
  }
  if (Date.now() - entry.firstAttemptAt >= LOGIN_WINDOW_MS) {
    entries.delete(key);
    return false;
  }
  return false;
}

export function recordLoginFailure(key: string): { blocked: boolean; remaining: number } {
  const now = Date.now();
  const entry = entries.get(key);
  if (entry?.lockedUntil && entry.lockedUntil > now)
    return { blocked: true, remaining: 0 };
  if (!entry || now - entry.firstAttemptAt >= LOGIN_WINDOW_MS) {
    entries.set(key, { firstAttemptAt: now, attempts: 1, lockedUntil: null });
    return { blocked: false, remaining: LOGIN_MAX_ATTEMPTS - 1 };
  }
  entry.attempts += 1;
  if (entry.attempts >= LOGIN_MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOGIN_LOCKOUT_MS;
    entry.attempts = 0;
    return { blocked: true, remaining: 0 };
  }
  entries.set(key, entry);
  return { blocked: false, remaining: LOGIN_MAX_ATTEMPTS - entry.attempts };
}

export function clearLoginFailures(key: string): void {
  entries.delete(key);
}
