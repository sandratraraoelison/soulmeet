import { afterEach, describe, expect, it, vi } from 'vitest';
import { refreshTokens } from './session';

describe('refreshTokens', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shares a single in-flight refresh for the same token', async () => {
    const tokens = { accessToken: 'access-1', refreshToken: 'refresh-2' };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(tokens), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const [first, second] = await Promise.all([
      refreshTokens('refresh-1'),
      refreshTokens('refresh-1'),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual(tokens);
    expect(second).toEqual(tokens);
  });

  it('returns null when the upstream rejects the refresh', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('denied', { status: 401 })));
    await expect(refreshTokens('refresh-1')).resolves.toBeNull();
  });
});