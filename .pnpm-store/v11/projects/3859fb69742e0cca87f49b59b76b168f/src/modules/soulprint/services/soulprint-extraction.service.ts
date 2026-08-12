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
/**
 * Converts new Guidance messages into durable Soulprint entries.
 *
 * The service owns the extraction lock and cursor. A cursor is advanced only
 * after a complete batch has been validated and merged, so retries are safe.
 */
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
    // A timestamp lock avoids concurrent extraction without requiring a
    // process-local mutex; stale locks can be reclaimed after a crash.
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
      // Changing the prompt invalidates the cursor so the upgraded extractor
      // can reinterpret the bounded conversation history.
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
      const messageBatch = await this.prisma.guidanceMessage.findMany({
        where: {
          conversation: { userId },
          ...(conversationId ? { conversationId } : {}),
          isDeleted: false,
          content: { not: null },
          ...(last ? { OR: [{ createdAt: { gt: last.createdAt } }, { createdAt: last.createdAt, id: { gt: soulprint.lastAnalyzedMessageId! } }] } : {}),
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: max + 1,
        select: {
          id: true,
          conversationId: true,
          role: true,
          content: true,
          createdAt: true,
        },
      });
      // Fetching max + 1 is a cheap continuation signal for the persistent
      // queue. Only the first max messages are sent to the provider.
      const hasMore = messageBatch.length > max;
      const messages = messageBatch.slice(0, max);
      const userMessages = messages.filter(
        (message) => message.role === 'USER',
      );
      const chars = userMessages.reduce(
        (sum, message) => sum + (message.content?.length ?? 0),
        0,
      );
      // Keep short fragments pending so a future message can provide enough
      // context. We intentionally do not advance the cursor in this branch.
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
      if (!userMessages.length) {
        const lastMessage = messages.at(-1);
        await this.prisma.soulprint.update({ where: { id: soulprint.id }, data: { extractionRunningAt: null, ...(lastMessage ? { lastAnalyzedMessageId: lastMessage.id, lastExtractedAt: new Date(), promptVersion } : {}) } });
        return { skipped: true, reason: 'no-new-user-messages' as const, hasMore };
      }
      // Deterministic extraction handles obvious declarations cheaply, but it
      // augments rather than replaces the general LLM pass.
      const directInterests = this.extractDirectInterests(userMessages);
      for (const entry of directInterests)
        await this.merge.merge(soulprint.id, entry, conversationId);
      // Existing IDs are required for grounded contradiction proposals. The
      // model may propose one, but application code remains authoritative.
      const currentEntries = await this.prisma.soulprintEntry.findMany({
        where: {
          soulprintId: soulprint.id,
          status: { in: [SoulprintEntryStatus.ACTIVE, SoulprintEntryStatus.CONFIRMED, SoulprintEntryStatus.PENDING_CONFIRMATION] },
        },
        select: { id: true, category: true, value: true, source: true, status: true },
        orderBy: { importance: 'desc' },
        take: 100,
      });
      const extractionMessages = [
        {
          role: 'system' as const,
          content: soulprintExtractionPrompt({ summary: soulprint.summary, entries: currentEntries }, messages),
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
        priority: 'background',
      });
      const parsed = this.parseAndValidate(
        response.content,
        new Set(userMessages.map((message) => message.id)),
      );
      let changed = directInterests.length;
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
        // Never supersede from a free-form model claim alone. The replacement
        // must exist in the same response and cite overlapping user evidence.
        const replacement = parsed.entries.find((entry) =>
          entry.category === contradiction.category &&
          this.merge.normalize(entry.value) === this.merge.normalize(contradiction.newValue) &&
          entry.evidenceMessageIds.some((id) => contradiction.evidenceMessageIds.includes(id)),
        );
        if (!replacement) continue;
        const existing = await this.prisma.soulprintEntry.findFirst({
          where: {
            id: contradiction.existingEntryId,
            soulprintId: soulprint.id,
            category: contradiction.category,
          },
        });
        if (existing && existing.status !== SoulprintEntryStatus.CONFIRMED)
          await this.prisma.$transaction(async (tx) => {
            const updated = await tx.soulprintEntry.update({ where: { id: existing.id }, data: { status: SoulprintEntryStatus.SUPERSEDED } });
            await tx.soulprintEntryChange.create({ data: { entryId: existing.id, changeType: 'SUPERSEDED_BY_CONTRADICTION', changedBy: 'SYSTEM', reason: contradiction.explanation, previousValue: existing as never, newValue: updated as never } });
          });
      }
      const lastMessage = messages.at(-1)!;
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
        hasMore,
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
    // This deliberately conservative lexical check catches obvious provider
    // hallucinations while leaving nuanced statements as tentative inference.
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
    // Only accept a narrow first-person grammar here. Ambiguous sentences are
    // left to the context-aware extractor instead of being guessed locally.
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
    // Provider output is untrusted. One JSON-object repair is tolerated for
    // providers that wrap JSON in prose; no executable parsing is used.
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
        entry.value.length > 2000 ||
        typeof entry.key !== 'string' || entry.key.length > 100 ||
        typeof entry.normalizedValue !== 'string' || entry.normalizedValue.length > 2000 ||
        typeof entry.reasoning !== 'string' || entry.reasoning.length > 1000 ||
        typeof entry.confidence !== 'number' ||
        entry.confidence < 0 ||
        entry.confidence > 1 ||
        typeof entry.importance !== 'number' ||
        !Number.isInteger(entry.importance) ||
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
    const contradictions = object.contradictions.map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item))
        throw new SoulprintException('SOULPRINT_EXTRACTION_INVALID_RESPONSE', 'Invalid contradiction');
      const contradiction = item as Record<string, unknown>;
      const ids = contradiction.evidenceMessageIds;
      if (typeof contradiction.existingEntryId !== 'string' || !contradiction.existingEntryId ||
        !Object.values(SoulprintCategory).includes(contradiction.category as SoulprintCategory) ||
        typeof contradiction.newValue !== 'string' || !contradiction.newValue.trim() || contradiction.newValue.length > 2000 ||
        typeof contradiction.explanation !== 'string' || !contradiction.explanation.trim() || contradiction.explanation.length > 1000 ||
        !Array.isArray(ids) || !ids.every((id) => typeof id === 'string' && allowedMessageIds.has(id)))
        throw new SoulprintException('SOULPRINT_EXTRACTION_INVALID_RESPONSE', 'Invalid contradiction');
      return contradiction as unknown as SoulprintExtractionResult['contradictions'][number];
    });
    return {
      entries,
      contradictions,
      summaryUpdateNeeded: object.summaryUpdateNeeded,
    };
  }
}
