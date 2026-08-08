import { Injectable } from '@nestjs/common';
import {
  Prisma,
  SoulprintEntryStatus,
  SoulprintSource,
  SoulprintVisibility,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { SoulprintException } from '../soulprint.exception';
import type { ExtractedSoulprintEntry } from '../interfaces/soulprint.interfaces';
type MergeableEntry = Omit<ExtractedSoulprintEntry, 'source'> & {
  source: SoulprintSource;
};

const priority: Record<SoulprintSource, number> = {
  AI_INFERRED: 1,
  USER_PROFILE: 2,
  USER_DECLARED: 3,
  MANUAL_USER_ENTRY: 4,
  SYSTEM_MIGRATION: 2,
  USER_CONFIRMED: 5,
};
@Injectable()
export class SoulprintMergeService {
  constructor(private readonly prisma: PrismaService) {}
  normalize(value: string) {
    return value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }
  fingerprint(
    entry: Pick<
      MergeableEntry,
      'category' | 'key' | 'normalizedValue' | 'value'
    >,
  ) {
    return `${entry.category}:${this.normalize(entry.key || entry.normalizedValue || entry.value)}`;
  }
  async merge(
    soulprintId: string,
    entry: MergeableEntry,
    conversationId?: string,
  ) {
    const fingerprint = this.fingerprint(entry);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.soulprintEntry.findUnique({
        where: { soulprintId_fingerprint: { soulprintId, fingerprint } },
      });
      if (existing?.status === SoulprintEntryStatus.REJECTED)
        throw new SoulprintException(
          'SOULPRINT_ENTRY_DUPLICATE',
          'An equivalent entry was previously rejected',
        );
      const status =
        entry.source === SoulprintSource.AI_INFERRED
          ? SoulprintEntryStatus.PENDING_CONFIRMATION
          : SoulprintEntryStatus.ACTIVE;
      const visibility =
        entry.suggestedVisibility === SoulprintVisibility.MATCHING_ALLOWED
          ? SoulprintVisibility.GUIDANCE_ONLY
          : entry.suggestedVisibility;
      const data = {
        category: entry.category,
        key: entry.key,
        value: entry.value,
        normalizedValue: entry.normalizedValue,
        source: entry.source,
        status,
        visibility,
        sensitivity: entry.sensitivity,
        confidence: Math.max(0, Math.min(1, entry.confidence)),
        importance: Math.max(0, Math.min(100, entry.importance)),
      };
      let result;
      if (existing) {
        const replace =
          priority[entry.source] >= priority[existing.source] &&
          entry.confidence >= existing.confidence;
        result = await tx.soulprintEntry.update({
          where: { id: existing.id },
          data: {
            ...(replace ? data : {}),
            lastObservedAt: new Date(),
            confidence: Math.max(existing.confidence, entry.confidence),
          },
        });
        await tx.soulprintEntryChange.create({
          data: {
            entryId: existing.id,
            changeType: replace ? 'MERGED_UPDATED' : 'EVIDENCE_ADDED',
            changedBy: 'SYSTEM',
            previousValue: existing as unknown as Prisma.InputJsonValue,
            newValue: result as unknown as Prisma.InputJsonValue,
          },
        });
      } else {
        result = await tx.soulprintEntry.create({
          data: { soulprintId, fingerprint, matchingWeight: 50, ...data },
        });
        await tx.soulprintEntryChange.create({
          data: {
            entryId: result.id,
            changeType: 'CREATED',
            changedBy: 'SYSTEM',
            newValue: result as unknown as Prisma.InputJsonValue,
          },
        });
      }
      for (const messageId of [...new Set(entry.evidenceMessageIds)]) {
        await tx.soulprintEvidence.upsert({
          where: { entryId_messageId: { entryId: result.id, messageId } },
          create: {
            entryId: result.id,
            messageId,
            conversationId,
          },
          update: {},
        });
      }
      return result;
    });
  }
}
