import { apiClient } from '@/api/client';
import { consentApi } from './consent';

describe('Soulprint conversation consent API', () => {
  afterEach(() => jest.restoreAllMocks());
  it('reads an undecided consent state', async () => {
    jest.spyOn(apiClient, 'get').mockResolvedValue({ data: { hasChoice: false, conversationAnalysisAllowed: false } } as never);
    await expect(consentApi.get()).resolves.toMatchObject({ hasChoice: false });
    expect(apiClient.get).toHaveBeenCalledWith('/soulprint/consent');
  });
  it('sends only the authenticated user choice', async () => {
    jest.spyOn(apiClient, 'put').mockResolvedValue({ data: { hasChoice: true, conversationAnalysisAllowed: true } } as never);
    await consentApi.update(true);
    expect(apiClient.put).toHaveBeenCalledWith('/soulprint/consent', { conversationAnalysisAllowed: true });
  });
  it('uses the dedicated endpoint to remove peer-derived insights', async () => {
    jest.spyOn(apiClient, 'delete').mockResolvedValue({ data: { removed: 1 } } as never);
    await consentApi.removeInsights();
    expect(apiClient.delete).toHaveBeenCalledWith('/soulprint/conversation-insights');
  });
});
