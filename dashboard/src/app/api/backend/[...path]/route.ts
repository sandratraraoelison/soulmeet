import { NextRequest, NextResponse } from 'next/server';
import { adminDevice, persistAdminDevice } from '@/lib/admin-device';
const base = process.env.API_URL ?? 'https://soulmeet-backend.onrender.com/api/v1';
const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 15 * 60 };

// AbortSignal instances are single-use. A module-level timeout becomes
// permanently aborted 15 seconds after the server starts and breaks every
// later proxy request with a 500 response.
const requestTimeout = () => AbortSignal.timeout(15_000);

async function callBackend(request: NextRequest, path: string[], token?: string) {
  return fetch(`${base}/${path.join('/')}${request.nextUrl.search}`, {
    method: request.method,
    headers: { Authorization: `Bearer ${token ?? ''}`, 'Content-Type': request.headers.get('content-type') ?? 'application/json' },
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.clone().text(),
    cache: 'no-store',
    signal: requestTimeout(),
  });
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  let response = await callBackend(request, path, request.cookies.get('sm_access')?.value);
  let session: { accessToken: string; refreshToken: string } | undefined;
  const refreshToken = request.cookies.get('sm_refresh')?.value;
  if (response.status === 401 && refreshToken) {
    const device = adminDevice(request);
    const refreshed = await fetch(`${base}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken, deviceInfo: device.info }), cache: 'no-store', signal: requestTimeout() });
    if (refreshed.ok) {
      session = await refreshed.json() as { accessToken: string; refreshToken: string };
      response = await callBackend(request, path, session.accessToken);
    }
  }
  const body = await response.text();
  const headers: Record<string, string> = { 'Content-Type': response.headers.get('content-type') ?? 'application/json' };
  const requestId = response.headers.get('x-request-id');
  if (requestId) headers['x-request-id'] = requestId;
  const result = new NextResponse(body, { status: response.status, headers });
  if (session) {
    const device = adminDevice(request);
    result.cookies.set('sm_access', session.accessToken, cookieOptions);
    result.cookies.set('sm_refresh', session.refreshToken, { ...cookieOptions, sameSite: 'strict', path: '/api', maxAge: 30 * 86400 });
    persistAdminDevice(result, device.id);
  } else if (response.status === 401) {
    result.cookies.set('sm_access', '', { path: '/', maxAge: 0 });
    result.cookies.set('sm_refresh', '', { path: '/api', maxAge: 0 });
  }
  return result;
}
export const GET = proxy; export const POST = proxy; export const PATCH = proxy; export const PUT = proxy; export const DELETE = proxy;
