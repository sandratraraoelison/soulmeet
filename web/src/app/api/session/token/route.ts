import { NextResponse } from 'next/server';
import {
  ACCESS_COOKIE,
  backendUrl,
  clearSession,
  REFRESH_COOKIE,
  refreshTokens,
  setSession,
} from '@/lib/session';

function decodeJwtExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'),
    ) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const forceRefresh = new URL(request.url).searchParams.get('refresh') === '1';
  const cookies = request.headers.get('cookie') ?? '';
  const read = (name: string) =>
    cookies
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.slice(name.length + 1);
  let accessToken = read(ACCESS_COOKIE);
  const refreshToken = read(REFRESH_COOKIE);
  let tokens;
  const exp = accessToken ? decodeJwtExpiry(accessToken) : null;
  const needsRefresh = forceRefresh || !accessToken || (exp !== null && exp * 1000 < Date.now() + 30_000);
  if (needsRefresh && refreshToken) {
    const refreshed = await refreshTokens(refreshToken);
    if (refreshed) {
      accessToken = refreshed.accessToken;
      tokens = refreshed;
    }
  }
  const response = NextResponse.json(
    {
      accessToken: accessToken ?? null,
      socketUrl: new URL(backendUrl()).origin,
    },
    { status: accessToken ? 200 : 401 },
  );
  if (tokens) setSession(response, tokens);
  else if (!accessToken) clearSession(response);
  return response;
}
