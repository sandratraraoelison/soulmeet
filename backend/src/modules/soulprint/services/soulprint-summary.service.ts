import { Injectable } from '@nestjs/common';
import {
  Prisma,
  SoulprintCategory,
  SoulprintEntryStatus,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { SoulprintSummary } from '../interfaces/soulprint.interfaces';

const buckets: Partial<
  Record<SoulprintCategory, keyof Omit<SoulprintSummary, 'overview'>>
> = {
  PERSONALITY: 'personality',
  CORE_VALUE: 'coreValues',
  INTEREST: 'interests',
  RELATIONSHIP_GOAL: 'relationshipGoals',
  COMMUNICATION_STYLE: 'communicationStyle',
  EMOTIONAL_NEED: 'emotionalNeeds',
  BOUNDARY: 'boundaries',
  STRENGTH: 'strengths',
  CHALLENGE: 'challenges',
  PARTNER_PREFERENCE: 'partnerPreferences',
};
const weights: Partial<Record<SoulprintCategory, number>> = {
  RELATIONSHIP_GOAL: 15,
  CORE_VALUE: 15,
  INTEREST: 10,
  COMMUNICATION_STYLE: 15,
  PARTNER_PREFERENCE: 15,
  BOUNDARY: 10,
  EMOTIONAL_NEED: 10,
  PERSONALITY: 10,
};
@Injectable()
export class SoulprintSummaryService {
  constructor(private readonly prisma: PrismaService) {}
  async recalculate(soulprintId: string) {
    const entries = await this.prisma.soulprintEntry.findMany({
      where: {
        soulprintId,
        status: {
          in: [SoulprintEntryStatus.ACTIVE, SoulprintEntryStatus.CONFIRMED],
        },
      },
      orderBy: { importance: 'desc' },
    });
    const summary: SoulprintSummary = {
      overview: entries
        .slice(0, 5)
        .map((e) => e.value)
        .join(' '),
      personality: [],
      coreValues: [],
      interests: [],
      relationshipGoals: [],
      communicationStyle: [],
      emotionalNeeds: [],
      boundaries: [],
      strengths: [],
      challenges: [],
      partnerPreferences: [],
    };
    for (const entry of entries) {
      const bucket = buckets[entry.category];
      if (bucket && !summary[bucket].includes(entry.value))
        summary[bucket].push(entry.value);
    }
    const categories = new Set(entries.map((entry) => entry.category));
    const completenessScore = Math.min(
      100,
      [...categories].reduce(
        (score, category) => score + (weights[category] ?? 0),
        0,
      ),
    );
    const current = await this.prisma.soulprint.findUniqueOrThrow({
      where: { id: soulprintId },
    });
    const version = current.summaryVersion + 1;
    return this.prisma.$transaction(async (tx) => {
      await tx.soulprintVersion.create({
        data: {
          soulprintId,
          version,
          snapshot: summary as unknown as Prisma.InputJsonValue,
        },
      });
      return tx.soulprint.update({
        where: { id: soulprintId },
        data: {
          summary: summary as unknown as Prisma.InputJsonValue,
          summaryVersion: version,
          completenessScore,
          lastSummarizedAt: new Date(),
        },
      });
    });
  }
}
