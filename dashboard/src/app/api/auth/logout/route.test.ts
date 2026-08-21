import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

describe('logout route', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('revokes the refresh token at the backend and clears cookies', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const request = new NextRequest('http://localhost:3002/api/auth/logout', {
      method: 'POST',
      headers: { cookie: 'sm_access=access-1; sm_refresh=refresh-1' },
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/auth/logout'), expect.objectContaining({ body: expect.stringContaining('refresh-1') }));
    const setCookies = response.headers.get('set-cookie') ?? '';
    expect(setCookies).toContain('sm_access=;');
    expect(setCookies).toContain('sm_refresh=;');
    expect(setCookies).toContain('Path=/api');
  });

  it('clears cookies even when no refresh token exists', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const request = new NextRequest('http://localhost:3002/api/auth/logout', { method: 'POST' });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
