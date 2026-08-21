import { afterEach, describe, expect, it, vi } from 'vitest';
import { consentService } from './consent';

describe('Soulprint conversation consent API', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('reads the authenticated user consent state', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ hasChoice: false, conversationAnalysisAllowed: false }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    await expect(consentService.get()).resolves.toMatchObject({ hasChoice: false });
    expect(fetch).toHaveBeenCalledWith('/api/backend/soulprint/consent', expect.any(Object));
  });
  it('persists a refusal without a user id', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ hasChoice: true, conversationAnalysisAllowed: false }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    await consentService.update(false);
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'PUT', body: JSON.stringify({ conversationAnalysisAllowed: false }) });
  });
  it('removes only conversation-derived insights through the dedicated endpoint', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ removed: 2 }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    await expect(consentService.removeInsights()).resolves.toEqual({ removed: 2 });
    expect(fetch).toHaveBeenCalledWith('/api/backend/soulprint/conversation-insights', expect.objectContaining({ method: 'DELETE' }));
  });
});
