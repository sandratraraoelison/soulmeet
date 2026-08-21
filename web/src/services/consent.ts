import { api, json } from './api';
export type SoulprintConsent = { hasChoice: boolean; conversationAnalysisAllowed: boolean; consentVersion: string; consentedAt: string | null; withdrawnAt: string | null; analysisAllowedFrom: string | null; lastChangedAt: string | null };
export const consentService = {
  get: () => api<SoulprintConsent>('/soulprint/consent'),
  update: (conversationAnalysisAllowed: boolean) => api<SoulprintConsent>('/soulprint/consent', json('PUT', { conversationAnalysisAllowed })),
  removeInsights: () => api<{ removed: number }>('/soulprint/conversation-insights', { method: 'DELETE' }),
};
