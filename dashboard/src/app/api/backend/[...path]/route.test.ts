import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });

describe('backend proxy route', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  function request(url: string, init?: RequestInit, cookie?: string): NextRequest {
    const headers = new Headers(init?.headers);
    if (cookie) headers.set('cookie', cookie);
    const { signal, ...rest } = init ?? {};
    void signal;
    return new NextRequest(`http://localhost:3001${url}`, { ...rest, headers });
  }

  const params = { params: Promise.resolve({ path: ['admin', 'overview'] }) };

  it('forwards the request with the access token', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(json({ metrics: {}, generatedAt: 'now' }));
    const response = await GET(request('/api/backend/admin/overview', { method: 'GET' }, 'sm_access=token-1'), params);
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/admin/overview'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token-1' }) }),
    );
  });

  it('refreshes the session on 401 and retries once', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(json({ message: 'Unauthorized' }, 401))
      .mockResolvedValueOnce(json({ accessToken: 'access-2', refreshToken: 'refresh-2' }))
      .mockResolvedValueOnce(json({ metrics: {}, generatedAt: 'now' }));
    const response = await GET(request('/api/backend/admin/overview', { method: 'GET' }, 'sm_access=token-1; sm_refresh=refresh-1'), params);
    expect(response.status).toBe(200);
    const setCookies = response.headers.get('set-cookie') ?? '';
    expect(setCookies).toContain('sm_access');
    expect(setCookies).toContain('sm_refresh');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining('/admin/overview'), expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer access-2' }) }));
  });

  it('clears cookies when the session cannot be restored', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(json({ message: 'Unauthorized' }, 401))
      .mockResolvedValueOnce(json({ message: 'Invalid refresh token' }, 401));
    const response = await GET(request('/api/backend/admin/overview', { method: 'GET' }, 'sm_access=token-1; sm_refresh=refresh-1'), params);
    expect(response.status).toBe(401);
    const setCookies = response.headers.get('set-cookie') ?? '';
    expect(setCookies).toContain('sm_access=;');
    expect(setCookies).toContain('sm_refresh=;');
    expect(setCookies).toContain('Path=/api');
  });

  it('rejects a request with no token as 401 through the backend', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(json({ message: 'Unauthorized' }, 401));
    const response = await GET(request('/api/backend/admin/overview'), params);
    expect(response.status).toBe(401);
  });
});
