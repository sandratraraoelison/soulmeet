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
import { LlmException } from '../../guidance/llm/llm.exception';
import { LLM_PROVIDER, LlmProvider } from '../../guidance/llm/llm.types';
import type { SoulprintExtractionResult } from '../interfaces/soulprint.interfaces';
import {
  soulprintExtractionPrompt,
  SOULPRINT_EXTRACTION_JSON_SCHEMA,
  SOULPRINT_EXTRACTION_PROMPT_VERSION,
} from '../prompts/soulprint-extraction.prompt';
import { SoulprintException } from '../soulprint.exception';
import { SoulprintMergeService } from './soulprint-merge.service';
import { SoulprintService } from './soulprint.service';
import { SoulprintSummaryService } from './soulprint-summary.service';

@Injectable()
export class SoulprintExtractionService {
  private readonly logger = new Logger(SoulprintExtractionService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly soulprints: SoulprintService,
    private readonly merge: SoulprintMergeService,
    private readonly summaries: SoulprintSummaryService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
  ) {}
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
      const promptVersion = this.config.get<string>(
        'SOULPRINT_PROMPT_VERSION',
        SOULPRINT_EXTRACTION_PROMPT_VERSION,
      );
      const last = soulprint.promptVersion === promptVersion && soulprint.lastAnalyzedMessageId
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
            1,
          ) &&
        chars <
          this.config.get<number>('SOULPRINT_EXTRACTION_MIN_CHARACTERS', 300)
      )
        return this.release(soulprint.id).then(() => ({ skipped: true, reason: 'threshold' as const }));
      if (!userMessages.length)
        return this.release(soulprint.id).then(() => ({ skipped: true, reason: 'no-new-user-messages' as const }));
      const directInterests = this.extractDirectInterests(userMessages);
      if (directInterests.length) {
        for (const entry of directInterests)
          await this.merge.merge(soulprint.id, entry, conversationId);
        const lastMessage = userMessages.at(-1)!;
        await this.prisma.soulprint.update({
          where: { id: soulprint.id },
          data: {
            lastAnalyzedMessageId: lastMessage.id,
            lastExtractedAt: new Date(),
            promptVersion,
            extractionRunningAt: null,
          },
        });
        if (this.config.get<boolean>('SOULPRINT_AUTO_SUMMARY_ENABLED', true))
          await this.summaries.recalculate(soulprint.id);
        return {
          skipped: false,
          extracted: directInterests.length,
          provider: 'deterministic',
          model: 'explicit-interest-v1',
        };
      }
      const extractionMessages = [
        {
          role: 'system' as const,
          content: soulprintExtractionPrompt(soulprint.summary, messages),
        },
        {
          role: 'user' as const,
          content:
            'Extract durable Soulprint information from the supplied untrusted messages.',
        },
      ];
      const response = await this.llm.complete(extractionMessages, {
        json: true,
        jsonSchema: SOULPRINT_EXTRACTION_JSON_SCHEMA,
        maxTokens: 1200,
        temperature: 0,
      });
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
        if (
          entry.source === SoulprintSource.USER_DECLARED &&
          !this.isGroundedDeclaration(entry, evidence)
        ) {
          this.logger.warn({
            userId,
            conversationId,
            code: 'SOULPRINT_UNGROUNDED_DECLARATION_SKIPPED',
          });
          continue;
        }
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
          promptVersion,
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
      if (error instanceof LlmException)
        throw new SoulprintException(
          error.code,
          'The AI provider could not extract Soulprint information',
          error.getStatus(),
        );
      this.logger.error({
        userId,
        conversationId,
        code: 'SOULPRINT_EXTRACTION_FAILED',
        cause:
          error instanceof Error
            ? {
                name: error.name,
                code:
                  'code' in error && typeof error.code === 'string'
                    ? error.code
                    : undefined,
              }
            : { name: 'UnknownError' },
      });
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
  isGroundedDeclaration(
    entry: SoulprintExtractionResult['entries'][number],
    evidence: { content: string | null }[],
  ) {
    const stopWords = new Set([
      'the', 'user', 'likes', 'like', 'enjoys', 'enjoy', 'prefers', 'prefer',
      'their', 'they', 'them', 'with', 'from', 'that', 'this', 'and', 'for',
    ]);
    const reference = entry.key || entry.normalizedValue || entry.value;
    const terms = this.merge
      .normalize(reference)
      .split(' ')
      .filter((term) => term.length >= 3 && !stopWords.has(term));
    if (!terms.length) return false;
    const source = this.merge.normalize(
      evidence.map((message) => message.content ?? '').join(' '),
    );
    return terms.some((term) => source.includes(term));
  }
  extractDirectInterests(
    messages: { id: string; content: string | null }[],
  ): SoulprintExtractionResult['entries'] {
    const entries: SoulprintExtractionResult['entries'] = [];
    const seen = new Set<string>();
    for (const message of messages) {
      const match = message.content?.match(
        /^\s*i\s+(?:also\s+)?(?:like|love|enjoy)\s+(.+?)(?:\s+too)?[.!]?\s*$/i,
      );
      if (!match?.[1] || /\b(?:but|because|if|whether|can|could|how|why|so)\b/i.test(match[1]))
        continue;
      const interests = match[1]
        .split(/\s*(?:,|\band\b)\s*/i)
        .map((value) => value.replace(/^(?:a|an|the)\s+/i, '').trim())
        .filter((value) => value.length >= 2 && value.length <= 80)
        .slice(0, 6);
      if (!interests.length || interests.join(' and ').length < match[1].length / 2)
        continue;
      for (const interest of interests) {
        const normalized = this.merge.normalize(interest);
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        entries.push({
          category: SoulprintCategory.INTEREST,
          key: normalized.replaceAll(' ', '-'),
          value: `The user likes ${interest}.`,
          normalizedValue: normalized,
          source: 'USER_DECLARED',
          confidence: 0.99,
          importance: 60,
          sensitivity: SoulprintSensitivity.NORMAL,
          suggestedVisibility: SoulprintVisibility.GUIDANCE_ONLY,
          reasoning: 'Explicit first-person interest statement.',
          evidenceMessageIds: [message.id],
        });
      }
    }
    return entries;
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
