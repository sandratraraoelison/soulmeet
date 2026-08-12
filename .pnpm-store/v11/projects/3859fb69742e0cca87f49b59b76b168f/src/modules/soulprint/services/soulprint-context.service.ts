import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SoulprintEntryStatus, SoulprintSource, SoulprintVisibility } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { SoulprintGuidanceContext } from '../interfaces/soulprint.interfaces';
@Injectable()
/** Builds the consent-filtered projection supplied to Guidance prompts. */
export class SoulprintContextService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}
  async forGuidance(userId: string): Promise<SoulprintGuidanceContext> {
    const max = this.config.get<number>('SOULPRINT_MAX_GUIDANCE_ENTRIES', 25);
    const soulprint = await this.prisma.soulprint.findUnique({ where: { userId }, include: { entries: { where: { status: { in: [SoulprintEntryStatus.ACTIVE, SoulprintEntryStatus.CONFIRMED, SoulprintEntryStatus.PENDING_CONFIRMATION] }, visibility: { in: [SoulprintVisibility.GUIDANCE_ONLY, SoulprintVisibility.MATCHING_ALLOWED] } }, orderBy: [{ importance: 'desc' }, { lastObservedAt: 'desc' }], take: max } } });
    if (!soulprint) return { confirmedFacts: [], declaredFacts: [], tentativeInsights: [] };
    // Do not reuse the user's private dashboard summary: rebuild an overview
    // exclusively from entries selected by the visibility query above.
    const overview = soulprint.entries
      .filter((entry) => entry.status !== SoulprintEntryStatus.PENDING_CONFIRMATION)
      .slice(0, 4)
      .map((entry) => entry.value)
      .join(' ');
    return {
      summary: overview || undefined,
      confirmedFacts: soulprint.entries.filter((e) => e.status === SoulprintEntryStatus.CONFIRMED).map((e) => ({ category: e.category, value: e.value, importance: e.importance })),
      declaredFacts: soulprint.entries.filter((e) => e.source !== SoulprintSource.AI_INFERRED && e.status !== SoulprintEntryStatus.CONFIRMED).map((e) => ({ category: e.category, value: e.value, importance: e.importance })),
      tentativeInsights: soulprint.entries.filter((e) => e.source === SoulprintSource.AI_INFERRED).map((e) => ({
        category: e.category,
        value: e.value,
        confidence: this.decayedConfidence(e.confidence, e.lastObservedAt ?? new Date()),
      })),
    };
  }
  private decayedConfidence(confidence: number, lastObservedAt: Date) {
    // Tentative insights lose authority gradually, with a floor so old context
    // remains recognizable without being presented as current certainty.
    const ageDays = Math.max(0, (Date.now() - lastObservedAt.getTime()) / 86_400_000);
    const decay = Math.max(0.5, 1 - ageDays / 730);
    return Math.round(confidence * decay * 100) / 100;
  }
}
