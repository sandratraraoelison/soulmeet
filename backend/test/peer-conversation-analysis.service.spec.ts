import { PeerConversationAnalysisService } from '../src/modules/soulprint/services/peer-conversation-analysis.service';

describe('PeerConversationAnalysisService consent gates', () => {
  it('does not enqueue a conversation without explicit consent', async () => {
    const prisma = { soulprintConsent: { findUnique: jest.fn().mockResolvedValue(null) }, peerConversationAnalysisJob: { upsert: jest.fn() } };
    const service = new PeerConversationAnalysisService(prisma as never, {} as never, {} as never, {} as never, {} as never);
    await expect(service.enqueue('user-a', 'conversation-a')).resolves.toBe(false);
    expect(prisma.peerConversationAnalysisJob.upsert).not.toHaveBeenCalled();
  });

  it('anchors a newly enabled analysis window to the consent date', async () => {
    const analysisAllowedFrom = new Date('2026-08-21T10:00:00Z');
    const prisma = {
      soulprintConsent: { findUnique: jest.fn().mockResolvedValue({ conversationAnalysisAllowed: true, analysisAllowedFrom }) },
      peerConversationAnalysisJob: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'job', userId: 'user-a', conversationId: 'conversation-a', lastProcessedAt: null }), update: jest.fn(), delete: jest.fn() },
      message: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new PeerConversationAnalysisService(prisma as never, {} as never, {} as never, {} as never, {} as never);
    await expect(service.analyze('job')).resolves.toEqual({ skipped: 'threshold' });
    expect(prisma.message.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ senderId: 'user-a', createdAt: { gt: analysisAllowedFrom } }) }));
  });

  it('abandons an existing job after consent withdrawal', async () => {
    const prisma = { soulprintConsent: { findUnique: jest.fn().mockResolvedValue({ conversationAnalysisAllowed: false, analysisAllowedFrom: null }) }, peerConversationAnalysisJob: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'job', userId: 'user-a', conversationId: 'conversation-a' }), delete: jest.fn() } };
    const service = new PeerConversationAnalysisService(prisma as never, {} as never, {} as never, {} as never, {} as never);
    await expect(service.analyze('job')).resolves.toEqual({ skipped: 'no-consent' });
    expect(prisma.peerConversationAnalysisJob.delete).toHaveBeenCalledWith({ where: { id: 'job' } });
  });
});
