import { NextResponse } from 'next/server';
export type Tokens = { accessToken: string; refreshToken: string };
const secure = process.env.NODE_ENV === 'production';
const prefix = secure ? '__Host-' : '';
export const ACCESS_COOKIE = `${prefix}sm_access`;
export const REFRESH_COOKIE = `${prefix}sm_refresh`;
export function setSession(response: NextResponse, tokens: Tokens) {
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60,
  });
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: 30 * 86400,
  });
  return response;
}
export function clearSession(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, '', {
    path: '/',
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 0,
  });
  response.cookies.set(REFRESH_COOKIE, '', {
    path: '/',
    httpOnly: true,
    secure,
    sameSite: 'strict',
    maxAge: 0,
  });
  return response;
}
export const backendUrl = () =>
  process.env.API_URL ?? 'https://soulmeet-backend.onrender.com/api/v1';

type InflightRefresh = { token: string; promise: Promise<Tokens | null> };
let inflight: InflightRefresh | null = null;

export function refreshTokens(refreshToken: string): Promise<Tokens | null> {
  if (inflight && inflight.token === refreshToken) return inflight.promise;
  const promise = (async () => {
    try {
      const refreshed = await fetch(`${backendUrl()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken, deviceInfo: 'Soulmeet Web' }),
        cache: 'no-store',
        signal: AbortSignal.timeout(20_000),
      });
      if (!refreshed.ok) return null;
      const data = (await refreshed.json()) as Tokens;
      return data.accessToken && data.refreshToken ? data : null;
    } catch {
      return null;
    }
  })();
  inflight = { token: refreshToken, promise };
  void promise.finally(() => {
    if (inflight?.token === refreshToken) inflight = null;
  });
  return promise;
}
