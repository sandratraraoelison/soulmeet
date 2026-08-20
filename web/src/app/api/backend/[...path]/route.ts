import { NextRequest, NextResponse } from 'next/server';
import {
  ACCESS_COOKIE,
  backendUrl,
  clearSession,
  REFRESH_COOKIE,
  refreshTokens,
  setSession,
  type Tokens,
} from '@/lib/session';
import { upstreamErrorResponse } from '@/lib/upstream-error';
async function upstream(request: NextRequest, path: string[], access?: string) {
  const headers = new Headers();
  if (access) headers.set('Authorization', `Bearer ${access}`);
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);
  return fetch(
    `${backendUrl()}/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`,
    {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method)
        ? undefined
        : await request.clone().arrayBuffer(),
      cache: 'no-store',
      signal: AbortSignal.timeout(95_000),
    },
  );
}
async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    let response = await upstream(request, path, request.cookies.get(ACCESS_COOKIE)?.value);
    let tokens: Tokens | undefined;
    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
    if (response.status === 401 && refreshToken && path.join('/') !== 'auth/refresh') {
      const refreshed = await refreshTokens(refreshToken);
      if (refreshed) {
        tokens = refreshed;
        response = await upstream(request, path, refreshed.accessToken);
      }
    }
    const result = new NextResponse(await response.arrayBuffer(), {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('content-type') ?? 'application/json' },
    });
    if (tokens) setSession(result, tokens);
    else if (response.status === 401) clearSession(result);
    return result;
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
