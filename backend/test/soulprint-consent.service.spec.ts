import { SoulprintEntryStatus, SoulprintSource } from '@prisma/client';
import { SoulprintConsentService, SOULPRINT_CONSENT_VERSION } from '../src/modules/soulprint/services/soulprint-consent.service';

describe('SoulprintConsentService', () => {
  it('returns an undecided state without creating implicit consent', async () => {
    const prisma = { soulprintConsent: { findUnique: jest.fn().mockResolvedValue(null) } };
    await expect(new SoulprintConsentService(prisma as never, {} as never).get('user-a')).resolves.toEqual(expect.objectContaining({ hasChoice: false, conversationAnalysisAllowed: false, consentVersion: SOULPRINT_CONSENT_VERSION }));
  });

  it('records the current choice and an immutable history event', async () => {
    const tx = { soulprintConsent: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() }, soulprintConsentEvent: { create: jest.fn() }, peerConversationAnalysisJob: { deleteMany: jest.fn() } };
    const prisma = { $transaction: jest.fn((callback) => callback(tx)), soulprintConsent: { findUnique: jest.fn().mockResolvedValue({ conversationAnalysisAllowed: true, consentVersion: SOULPRINT_CONSENT_VERSION, consentedAt: new Date(), withdrawnAt: null, analysisAllowedFrom: new Date(), updatedAt: new Date() }) } };
    await new SoulprintConsentService(prisma as never, {} as never).update('user-a', true);
    expect(tx.soulprintConsent.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-a' }, create: expect.objectContaining({ conversationAnalysisAllowed: true }) }));
    expect(tx.soulprintConsentEvent.create).toHaveBeenCalled();
  });

  it('removes only peer-derived insights and regenerates the summary', async () => {
    const prisma = { soulprint: { findUnique: jest.fn().mockResolvedValue({ id: 'soulprint-id' }), update: jest.fn() }, soulprintEntry: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) } };
    const summaries = { recalculate: jest.fn() };
    await expect(new SoulprintConsentService(prisma as never, summaries as never).removeConversationInsights('user-a')).resolves.toEqual({ removed: 2 });
    expect(prisma.soulprintEntry.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ source: SoulprintSource.PEER_CONVERSATION }), data: expect.objectContaining({ status: SoulprintEntryStatus.DELETED }) }));
    expect(summaries.recalculate).toHaveBeenCalledWith('soulprint-id');
  });
});
