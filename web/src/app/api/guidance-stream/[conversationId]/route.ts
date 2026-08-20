import { NextRequest, NextResponse } from 'next/server';
import {
  ACCESS_COOKIE,
  backendUrl,
  REFRESH_COOKIE,
  refreshTokens,
  setSession,
  type Tokens,
} from '@/lib/session';
import { upstreamErrorResponse } from '@/lib/upstream-error';
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const { conversationId } = await params;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  let token = request.cookies.get(ACCESS_COOKIE)?.value;
  let tokens: Tokens | undefined;
  if (!token && refreshToken) {
    tokens = (await refreshTokens(refreshToken)) ?? undefined;
    token = tokens?.accessToken;
  }
  if (!token) return NextResponse.json({ message: 'Session expired' }, { status: 401 });
  const body = await request.text();
  try {
    let upstream = await fetch(
      `${backendUrl()}/guidance/conversations/${encodeURIComponent(conversationId)}/messages/stream`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body,
        signal: request.signal,
      },
    );
    if (upstream.status === 401 && refreshToken) {
      tokens = (await refreshTokens(refreshToken)) ?? undefined;
      if (tokens) {
        token = tokens.accessToken;
        upstream = await fetch(
          `${backendUrl()}/guidance/conversations/${encodeURIComponent(conversationId)}/messages/stream`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body,
            signal: request.signal,
          },
        );
      }
    }
    if (!upstream.ok)
      return new NextResponse(await upstream.text(), {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json' },
      });
    const result = new NextResponse(upstream.body, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform' },
    });
    if (tokens) setSession(result, tokens);
    return result;
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}