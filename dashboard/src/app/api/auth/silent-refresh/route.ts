import { NextRequest, NextResponse } from 'next/server';

const base = process.env.API_URL ?? 'https://soulmeet-backend.onrender.com/api/v1';
const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT'];

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('sm_refresh')?.value;
  if (!refreshToken) return NextResponse.json({ ok: false }, { status: 401 });
  const response = await fetch(`${base}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  });
  if (!response.ok) {
    const result = NextResponse.json({ ok: false }, { status: 401 });
    result.cookies.set('sm_access', '', { path: '/', maxAge: 0 });
    result.cookies.set('sm_refresh', '', { path: '/api', maxAge: 0 });
    return result;
  }
  const data = await response.json() as { accessToken: string; refreshToken: string };
  const meResponse = await fetch(`${base}/auth/me`, { headers: { Authorization: `Bearer ${data.accessToken}` }, cache: 'no-store' });
  const me = await meResponse.json().catch(() => null) as { role?: string; email?: string } | null;
  if (!me?.role || !adminRoles.includes(me.role)) {
    const result = NextResponse.json({ ok: false }, { status: 403 });
    result.cookies.set('sm_access', '', { path: '/', maxAge: 0 });
    result.cookies.set('sm_refresh', '', { path: '/api', maxAge: 0 });
    return result;
  }
  const result = NextResponse.json({ ok: true, role: me.role, email: me.email });
  result.cookies.set('sm_access', data.accessToken, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 15 * 60 });
  result.cookies.set('sm_refresh', data.refreshToken, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/api', maxAge: 30 * 86400 });
  return result;
}
