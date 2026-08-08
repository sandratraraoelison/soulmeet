import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SoulprintCategory,
  SoulprintEntryStatus,
  SoulprintSensitivity,
  SoulprintSource,
  SoulprintVisibility,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { LLM_PROVIDER, LlmProvider } from '../../guidance/llm/llm.types';
import type { SoulprintExtractionResult } from '../interfaces/soulprint.interfaces';
import {
  soulprintExtractionPrompt,
  SOULPRINT_EXTRACTION_PROMPT_VERSION,
} from '../prompts/soulprint-extraction.prompt';
import { SoulprintException } from '../soulprint.exception';
import { SoulprintMergeService } from './soulprint-merge.service';
import { SoulprintService } from './soulprint.service';
import { SoulprintSummaryService } from './soulprint-summary.service';

@Injectable()
export class SoulprintExtractionService {
  private readonly logger = new Logger(SoulprintExtractionService.name);
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly soulprints: SoulprintService,
    private readonly merge: SoulprintMergeService,
    private readonly summaries: SoulprintSummaryService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
  ) {}
  schedule(userId: string, conversationId: string) {
    if (!this.config.get<boolean>('SOULPRINT_EXTRACTION_ENABLED', true)) return;
    const existing = this.timers.get(userId);
    if (existing) clearTimeout(existing);
    const delay =
      this.config.get<number>('SOULPRINT_EXTRACTION_DEBOUNCE_SECONDS', 30) *
      1000;
    const timer = setTimeout(() => {
      this.timers.delete(userId);
      void this.extract(userId, conversationId).catch((error: unknown) =>
        this.logger.warn({
          userId,
          conversationId,
          code:
            error instanceof SoulprintException
              ? error.code
              : 'SOULPRINT_EXTRACTION_FAILED',
        }),
      );
    }, delay);
    this.timers.set(userId, timer);
  }
  async extract(userId: string, conversationId?: string, force = false) {
    if (!this.config.get<boolean>('SOULPRINT_EXTRACTION_ENABLED', true))
      throw new SoulprintException(
        'SOULPRINT_EXTRACTION_DISABLED',
        'Soulprint extraction is disabled',
      );
    const soulprint = await this.soulprints.ensure(userId);
    const staleBefore = new Date(
      Date.now() -
        this.config.get<number>('SOULPRINT_EXTRACTION_TIMEOUT_MS', 120000),
    );
    const lock = await this.prisma.soulprint.updateMany({
      where: {
        id: soulprint.id,
        OR: [
          { extractionRunningAt: null },
          { extractionRunningAt: { lt: staleBefore } },
        ],
      },
      data: { extractionRunningAt: new Date() },
    });
    if (!lock.count)
      throw new SoulprintException(
        'SOULPRINT_EXTRACTION_ALREADY_RUNNING',
        'Soulprint extraction is already running',
        HttpStatus.CONFLICT,
      );
    try {
      const last = soulprint.lastAnalyzedMessageId
        ? await this.prisma.guidanceMessage.findUnique({
            where: { id: soulprint.lastAnalyzedMessageId },
            select: { createdAt: true },
          })
        : null;
      const max = this.config.get<number>(
        'SOULPRINT_EXTRACTION_MAX_MESSAGES',
        20,
      );
      const messages = await this.prisma.guidanceMessage.findMany({
        where: {
          conversation: { userId },
          ...(conversationId ? { conversationId } : {}),
          isDeleted: false,
          content: { not: null },
          ...(last ? { createdAt: { gt: last.createdAt } } : {}),
        },
        orderBy: { createdAt: 'asc' },
        take: max,
        select: {
          id: true,
          conversationId: true,
          role: true,
          content: true,
          createdAt: true,
        },
      });
      const userMessages = messages.filter(
        (message) => message.role === 'USER',
      );
      const chars = userMessages.reduce(
        (sum, message) => sum + (message.content?.length ?? 0),
        0,
      );
      if (
        !force &&
        userMessages.length <
          this.config.get<number>(
            'SOULPRINT_EXTRACTION_MIN_USER_MESSAGES',
            3,
          ) &&
        chars <
          this.config.get<number>('SOULPRINT_EXTRACTION_MIN_CHARACTERS', 300)
      )
        return this.release(soulprint.id).then(() => ({ skipped: true, reason: 'threshold' as const }));
      if (!userMessages.length)
        return this.release(soulprint.id).then(() => ({ skipped: true, reason: 'no-new-user-messages' as const }));
      const response = await this.llm.complete([
        {
          role: 'system',
          content: soulprintExtractionPrompt(soulprint.summary, messages),
        },
        {
          role: 'user',
          content:
            'Extract durable Soulprint information from the supplied untrusted messages.',
        },
      ]);
      const parsed = this.parseAndValidate(
        response.content,
        new Set(userMessages.map((message) => message.id)),
      );
      let changed = 0;
      for (const entry of parsed.entries) {
        const evidence = userMessages.filter((message) =>
          entry.evidenceMessageIds.includes(message.id),
        );
        if (!evidence.length) continue;
        await this.merge.merge(
          soulprint.id,
          entry,
          evidence[0]?.conversationId,
        );
        changed++;
      }
      for (const contradiction of parsed.contradictions) {
        if (!contradiction.existingEntryId) continue;
        const existing = await this.prisma.soulprintEntry.findFirst({
          where: {
            id: contradiction.existingEntryId,
            soulprintId: soulprint.id,
          },
        });
        if (existing && existing.status !== SoulprintEntryStatus.CONFIRMED)
          await this.prisma.$transaction(async (tx) => {
            const updated = await tx.soulprintEntry.update({ where: { id: existing.id }, data: { status: SoulprintEntryStatus.SUPERSEDED } });
            await tx.soulprintEntryChange.create({ data: { entryId: existing.id, changeType: 'SUPERSEDED_BY_CONTRADICTION', changedBy: 'SYSTEM', reason: contradiction.explanation, previousValue: existing as never, newValue: updated as never } });
          });
      }
      const lastMessage = userMessages.at(-1)!;
      await this.prisma.soulprint.update({
        where: { id: soulprint.id },
        data: {
          lastAnalyzedMessageId: lastMessage.id,
          lastExtractedAt: new Date(),
          promptVersion: this.config.get<string>(
            'SOULPRINT_PROMPT_VERSION',
            SOULPRINT_EXTRACTION_PROMPT_VERSION,
          ),
          extractionRunningAt: null,
        },
      });
      if (
        this.config.get<boolean>('SOULPRINT_AUTO_SUMMARY_ENABLED', true) &&
        (parsed.summaryUpdateNeeded ||
          changed >=
            this.config.get<number>('SOULPRINT_SUMMARY_CHANGE_THRESHOLD', 3))
      )
        await this.summaries.recalculate(soulprint.id);
      return {
        skipped: false,
        extracted: changed,
        provider: response.provider,
        model: response.model,
      };
    } catch (error) {
      await this.prisma.soulprint
        .update({
          where: { id: soulprint.id },
          data: { extractionRunningAt: null },
        })
        .catch(() => undefined);
      if (error instanceof SoulprintException) throw error;
      throw new SoulprintException(
        'SOULPRINT_EXTRACTION_FAILED',
        'Soulprint extraction failed',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
  private release(soulprintId: string) {
    return this.prisma.soulprint.update({ where: { id: soulprintId }, data: { extractionRunningAt: null } });
  }
  parseAndValidate(
    raw: string,
    allowedMessageIds: Set<string>,
  ): SoulprintExtractionResult {
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start < 0 || end <= start)
        throw new SoulprintException(
          'SOULPRINT_EXTRACTION_INVALID_RESPONSE',
          'Invalid extraction response',
          HttpStatus.BAD_GATEWAY,
        );
      try {
        value = JSON.parse(raw.slice(start, end + 1));
      } catch {
        throw new SoulprintException(
          'SOULPRINT_EXTRACTION_INVALID_RESPONSE',
          'Invalid extraction response',
          HttpStatus.BAD_GATEWAY,
        );
      }
    }
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new SoulprintException(
        'SOULPRINT_EXTRACTION_INVALID_RESPONSE',
        'Invalid extraction response',
        HttpStatus.BAD_GATEWAY,
      );
    const object = value as Record<string, unknown>;
    if (
      !Array.isArray(object.entries) ||
      !Array.isArray(object.contradictions) ||
      typeof object.summaryUpdateNeeded !== 'boolean'
    )
      throw new SoulprintException(
        'SOULPRINT_EXTRACTION_INVALID_RESPONSE',
        'Invalid extraction response',
        HttpStatus.BAD_GATEWAY,
      );
    const entries = object.entries.map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item))
        throw new SoulprintException(
          'SOULPRINT_EXTRACTION_INVALID_RESPONSE',
          'Invalid entry',
        );
      const entry = item as Record<string, unknown>;
      const ids = entry.evidenceMessageIds;
      if (
        !Object.values(SoulprintCategory).includes(
          entry.category as SoulprintCategory,
        ) ||
        (entry.source !== SoulprintSource.USER_DECLARED &&
          entry.source !== SoulprintSource.AI_INFERRED) ||
        !Object.values(SoulprintSensitivity).includes(
          entry.sensitivity as SoulprintSensitivity,
        ) ||
        !Object.values(SoulprintVisibility).includes(
          entry.suggestedVisibility as SoulprintVisibility,
        ) ||
        typeof entry.value !== 'string' ||
        !entry.value.trim() ||
        typeof entry.confidence !== 'number' ||
        entry.confidence < 0 ||
        entry.confidence > 1 ||
        typeof entry.importance !== 'number' ||
        entry.importance < 0 ||
        entry.importance > 100 ||
        !Array.isArray(ids) ||
        !ids.every((id) => typeof id === 'string' && allowedMessageIds.has(id))
      )
        throw new SoulprintException(
          'SOULPRINT_EXTRACTION_INVALID_RESPONSE',
          'Invalid entry',
        );
      return entry as unknown as SoulprintExtractionResult['entries'][number];
    });
    return {
      entries,
      contradictions:
        object.contradictions as SoulprintExtractionResult['contradictions'],
      summaryUpdateNeeded: object.summaryUpdateNeeded,
    };
  }
}
