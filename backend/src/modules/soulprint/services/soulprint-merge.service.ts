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
/** Applies source precedence, deduplication, evidence and audit history atomically. */
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
  private similarity(left: string, right: string) {
    // Conservative Jaccard matching catches near-identical wording only. A
    // high threshold avoids merging genuinely different preferences.
    const a = new Set(this.normalize(left).split(' ').filter((term) => term.length > 2));
    const b = new Set(this.normalize(right).split(' ').filter((term) => term.length > 2));
    if (!a.size || !b.size) return 0;
    const intersection = [...a].filter((term) => b.has(term)).length;
    return intersection / new Set([...a, ...b]).size;
  }
  async merge(
    soulprintId: string,
    entry: MergeableEntry,
    conversationId?: string,
  ) {
    const fingerprint = this.fingerprint(entry);
    // Entry mutation, evidence and history form one consistency boundary.
    return this.prisma.$transaction(async (tx) => {
      let existing = await tx.soulprintEntry.findUnique({
        where: { soulprintId_fingerprint: { soulprintId, fingerprint } },
        include: {
          evidence: {
            where: { messageId: { in: [...new Set(entry.evidenceMessageIds)] } },
            select: { messageId: true },
          },
        },
      });
      if (!existing) {
        const candidates = await tx.soulprintEntry.findMany({
          where: {
            soulprintId,
            category: entry.category,
            status: { in: [SoulprintEntryStatus.ACTIVE, SoulprintEntryStatus.CONFIRMED, SoulprintEntryStatus.PENDING_CONFIRMATION] },
          },
          include: {
            evidence: {
              where: { messageId: { in: [...new Set(entry.evidenceMessageIds)] } },
              select: { messageId: true },
            },
          },
          orderBy: { lastObservedAt: 'desc' },
          take: 30,
        });
        existing = candidates.find((candidate) =>
          this.similarity(candidate.normalizedValue || String(candidate.value), entry.normalizedValue || entry.value) >= 0.8,
        ) ?? null;
      }
      if (existing?.status === SoulprintEntryStatus.REJECTED)
        throw new SoulprintException(
          'SOULPRINT_ENTRY_DUPLICATE',
          'An equivalent entry was previously rejected',
        );
      // Inference is never silently promoted to fact; only user-controlled
      // confirmation can move it out of PENDING_CONFIRMATION.
      const status =
        entry.source === SoulprintSource.AI_INFERRED
          ? SoulprintEntryStatus.PENDING_CONFIRMATION
          : SoulprintEntryStatus.ACTIVE;
      // Extraction may suggest Guidance visibility but can never grant matching
      // consent on the user's behalf.
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
        const existingEvidenceIds = new Set(
          (existing.evidence ?? []).map((evidence) => evidence.messageId),
        );
        const hasNewEvidence = entry.evidenceMessageIds.some(
          (messageId) => !existingEvidenceIds.has(messageId),
        );
        const replace =
          priority[entry.source] >= priority[existing.source] &&
          entry.confidence >= existing.confidence;
        const hasContentChanges =
          replace &&
          (existing.category !== data.category ||
            this.normalize(existing.key ?? '') !== this.normalize(data.key ?? '') ||
            this.normalize(String(existing.value)) !== this.normalize(data.value) ||
            this.normalize(existing.normalizedValue ?? '') !== this.normalize(data.normalizedValue ?? '') ||
            existing.source !== data.source ||
            existing.status !== data.status ||
            existing.visibility !== data.visibility ||
            existing.sensitivity !== data.sensitivity ||
            existing.confidence !== data.confidence ||
            existing.importance !== data.importance);
        if (!hasContentChanges && !hasNewEvidence) return existing;
        result = await tx.soulprintEntry.update({
          where: { id: existing.id },
          data: {
            ...(hasContentChanges ? data : {}),
            lastObservedAt: new Date(),
            confidence: Math.max(existing.confidence, entry.confidence),
          },
        });
        await tx.soulprintEntryChange.create({
          data: {
            entryId: existing.id,
            changeType: hasContentChanges ? 'MERGED_UPDATED' : 'EVIDENCE_ADDED',
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
