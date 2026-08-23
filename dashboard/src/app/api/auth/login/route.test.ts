import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { clearLoginFailures, LOGIN_MAX_ATTEMPTS } from '@/lib/login-rate-limit';
import { POST } from './route';

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });

describe('login route', () => {
  beforeEach(() => {
    clearLoginFailures('1.2.3.4|admin@example.com');
    vi.stubGlobal('fetch', vi.fn());
  });

  function request(body: Record<string, string>): NextRequest {
    return new NextRequest('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
      body: JSON.stringify(body),
    });
  }

  it('rejects invalid credentials and returns 401', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(json({ message: 'Invalid credentials' }, 401));
    const response = await POST(request({ email: 'admin@example.com', password: 'wrong-password' }));
    expect(response.status).toBe(401);
  });

  it('locks the account after the maximum failed attempts', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(json({ message: 'Invalid credentials' }, 401));
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS; i++) {
      await POST(request({ email: 'admin@example.com', password: 'wrong-password' }));
    }
    const blocked = await POST(request({ email: 'admin@example.com', password: 'wrong-password' }));
    expect(blocked.status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(LOGIN_MAX_ATTEMPTS);
  });

  it('requires an administrator role and logs out a regular user', async () => {
    const fetchMock = vi.mocked(fetch);
    const tokens = { accessToken: 'access-1', refreshToken: 'refresh-1' };
    fetchMock
      .mockResolvedValueOnce(json(tokens))
      .mockResolvedValueOnce(json({ role: 'USER', email: 'admin@example.com' }))
      .mockResolvedValueOnce(json({ ok: true }));
    const response = await POST(request({ email: 'admin@example.com', password: 'password123' }));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toBe('Administrator access required');
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/auth/logout'), expect.any(Object));
  });

  it('signs an administrator in with a Google identity token', async () => {
    const fetchMock = vi.mocked(fetch);
    const tokens = { accessToken: 'google-access', refreshToken: 'google-refresh' };
    fetchMock
      .mockResolvedValueOnce(json(tokens))
      .mockResolvedValueOnce(json({ role: 'SUPER_ADMIN', email: 'admin@gmail.com' }));

    const response = await POST(request({ identityToken: 'google-id-token' }));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenNthCalledWith(1, expect.stringContaining('/auth/google'), expect.objectContaining({
      body: JSON.stringify({ identityToken: 'google-id-token' }),
    }));
    expect(response.headers.get('set-cookie')).toContain('sm_access=google-access');
  });

  it('returns requiresTwoFactor and completes the second step', async () => {
    const fetchMock = vi.mocked(fetch);
    const tokens = { accessToken: 'access-1', refreshToken: 'refresh-1' };
    fetchMock
      .mockResolvedValueOnce(json({ requiresTwoFactor: true, twoFactorToken: 'totp-token' }))
      .mockResolvedValueOnce(json(tokens))
      .mockResolvedValueOnce(json({ role: 'SUPER_ADMIN', email: 'admin@example.com' }))
      .mockResolvedValueOnce(json({ role: 'SUPER_ADMIN', email: 'admin@example.com' }));
    const first = await POST(request({ email: 'admin@example.com', password: 'password123' }));
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual(expect.objectContaining({ requiresTwoFactor: true, twoFactorToken: 'totp-token' }));
    const second = await POST(request({ email: 'admin@example.com', password: '', twoFactorToken: 'totp-token', code: '123456' }));
    expect(second.status).toBe(200);
    const setCookies = second.headers.get('set-cookie') ?? '';
    expect(setCookies).toContain('sm_access');
    expect(setCookies).toContain('sm_refresh');
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/auth/login/2fa'), expect.any(Object));
  });
});
