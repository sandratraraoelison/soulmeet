import { Injectable } from '@nestjs/common';
import { SoulprintEntryStatus, SoulprintSource } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { SoulprintSummaryService } from './soulprint-summary.service';

export const SOULPRINT_CONSENT_VERSION = '2026-08-21';

@Injectable()
export class SoulprintConsentService {
  constructor(private readonly prisma: PrismaService, private readonly summaries: SoulprintSummaryService) {}

  async get(userId: string) {
    const consent = await this.prisma.soulprintConsent.findUnique({ where: { userId } });
    if (!consent) return { hasChoice: false, conversationAnalysisAllowed: false, consentVersion: SOULPRINT_CONSENT_VERSION, consentedAt: null, withdrawnAt: null, analysisAllowedFrom: null, lastChangedAt: null };
    return { hasChoice: true, conversationAnalysisAllowed: consent.conversationAnalysisAllowed, consentVersion: consent.consentVersion, consentedAt: consent.consentedAt, withdrawnAt: consent.withdrawnAt, analysisAllowedFrom: consent.analysisAllowedFrom, lastChangedAt: consent.updatedAt };
  }

  async update(userId: string, allowed: boolean) {
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.soulprintConsent.findUnique({ where: { userId } });
      await tx.soulprintConsent.upsert({
        where: { userId },
        create: { userId, conversationAnalysisAllowed: allowed, consentVersion: SOULPRINT_CONSENT_VERSION, consentedAt: allowed ? now : null, withdrawnAt: allowed ? null : now, analysisAllowedFrom: allowed ? now : null },
        update: { conversationAnalysisAllowed: allowed, consentVersion: SOULPRINT_CONSENT_VERSION, consentedAt: allowed ? now : current?.consentedAt, withdrawnAt: allowed ? null : now, analysisAllowedFrom: allowed && !current?.conversationAnalysisAllowed ? now : current?.analysisAllowedFrom },
      });
      await tx.soulprintConsentEvent.create({ data: { userId, conversationAnalysisAllowed: allowed, consentVersion: SOULPRINT_CONSENT_VERSION, changedAt: now } });
      if (!allowed) await tx.peerConversationAnalysisJob.deleteMany({ where: { userId } });
    });
    return this.get(userId);
  }

  async removeConversationInsights(userId: string) {
    const soulprint = await this.prisma.soulprint.findUnique({ where: { userId }, select: { id: true } });
    if (!soulprint) return { removed: 0 };
    const result = await this.prisma.soulprintEntry.updateMany({ where: { soulprintId: soulprint.id, source: SoulprintSource.PEER_CONVERSATION, status: { notIn: [SoulprintEntryStatus.DELETED, SoulprintEntryStatus.REJECTED] } }, data: { status: SoulprintEntryStatus.DELETED, deletedAt: new Date() } });
    await this.prisma.soulprint.update({ where: { id: soulprint.id }, data: { lastSummarizedAt: null } });
    await this.summaries.recalculate(soulprint.id);
    return { removed: result.count };
  }
}
