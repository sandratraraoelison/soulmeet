import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, json } from './api';
describe('autonomous API client', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('uses the web BFF and same-origin credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await expect(api<{ ok: boolean }>('/profile')).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/profile',
      expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' }),
    );
  });
  it('turns backend failures into safe errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ message: 'Invalid information' }), { status: 400 }),
        ),
    );
    const failure = api('/profile', json('PUT', {}));
    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({ message: 'Invalid information', status: 400 });
  });
});
