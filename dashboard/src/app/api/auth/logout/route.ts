import { NextRequest, NextResponse } from 'next/server';
const base = process.env.API_URL ?? 'http://localhost:3000/api/v1';
export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('sm_refresh')?.value;
  if (refreshToken) await fetch(`${base}/auth/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) }).catch(() => undefined);
  const response = NextResponse.json({ ok: true });
  response.cookies.set('sm_access', '', { path: '/', maxAge: 0 });
  response.cookies.set('sm_refresh', '', { path: '/api', maxAge: 0 });
  return response;
}
