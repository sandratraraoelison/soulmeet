import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SoulprintEntryStatus, SoulprintSource, SoulprintVisibility } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { SoulprintGuidanceContext } from '../interfaces/soulprint.interfaces';
@Injectable()
export class SoulprintContextService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}
  async forGuidance(userId: string): Promise<SoulprintGuidanceContext> {
    const max = this.config.get<number>('SOULPRINT_MAX_GUIDANCE_ENTRIES', 25);
    const soulprint = await this.prisma.soulprint.findUnique({ where: { userId }, include: { entries: { where: { status: { in: [SoulprintEntryStatus.ACTIVE, SoulprintEntryStatus.CONFIRMED, SoulprintEntryStatus.PENDING_CONFIRMATION] }, visibility: { in: [SoulprintVisibility.GUIDANCE_ONLY, SoulprintVisibility.MATCHING_ALLOWED] } }, orderBy: [{ importance: 'desc' }, { lastObservedAt: 'desc' }], take: max } } });
    if (!soulprint) return { confirmedFacts: [], declaredFacts: [], tentativeInsights: [] };
    const overview = soulprint.summary && typeof soulprint.summary === 'object' && !Array.isArray(soulprint.summary) ? String((soulprint.summary as Record<string, unknown>).overview ?? '') : undefined;
    return {
      summary: overview || undefined,
      confirmedFacts: soulprint.entries.filter((e) => e.status === SoulprintEntryStatus.CONFIRMED).map((e) => ({ category: e.category, value: e.value, importance: e.importance })),
      declaredFacts: soulprint.entries.filter((e) => e.source !== SoulprintSource.AI_INFERRED && e.status !== SoulprintEntryStatus.CONFIRMED).map((e) => ({ category: e.category, value: e.value, importance: e.importance })),
      tentativeInsights: soulprint.entries.filter((e) => e.source === SoulprintSource.AI_INFERRED).map((e) => ({ category: e.category, value: e.value, confidence: e.confidence })),
    };
  }
}
