import { NextRequest, NextResponse } from 'next/server';
import {
  backendUrl,
  clearSession,
  REFRESH_COOKIE,
  setSession,
  type Tokens,
} from '@/lib/session';
import { upstreamErrorResponse } from '@/lib/upstream-error';
const allowed = new Set(['login', 'register', 'google', 'apple']);
function errorMessage(data: unknown): string {
  const d = data as
    | { message?: string | string[]; error?: string | { message?: string | string[] } }
    | null;
  const raw =
    d && d.error && typeof d.error === 'object' ? d.error.message : d?.error ?? d?.message;
  if (Array.isArray(raw)) return raw.join(' ');
  return typeof raw === 'string' && raw ? raw : 'Authentication failed.';
}
export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (!allowed.has(action)) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  const body = await request.text();
  try {
    const upstream = await fetch(`${backendUrl()}/auth/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Info': `Soulmeet Web | ${request.headers.get('user-agent') ?? 'browser'}`,
      },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(45_000),
    });
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok)
      return NextResponse.json({ message: errorMessage(data) }, {
        status: upstream.status,
      });
    const tokens = data as Tokens;
    if (!tokens.accessToken || !tokens.refreshToken)
      return NextResponse.json({ message: 'Invalid session response.' }, { status: 502 });
    return setSession(NextResponse.json({ ok: true }), tokens);
  } catch (error) {
    return upstreamErrorResponse(error);
  }
}
export async function DELETE(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (refreshToken)
    await fetch(`${backendUrl()}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  return clearSession(NextResponse.json({ ok: true }));
}
