import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { LLM_PROVIDER, LlmProvider } from '../guidance/llm/llm.types';

export type SemanticEntry = { id?: string; category: string; key: string | null; normalizedValue: string | null; value: string; matchingWeight: number; semanticData?: unknown; semanticSourceHash?: string | null };
export type SemanticCandidate = { id: string; entries: SemanticEntry[]; baseScore: number };
export type SemanticEvaluation = { candidateId: string; semanticScore: number; confidence: number; compatibleConcepts: string[]; contradictions: string[]; reasons: string[]; model: string };

type ProviderOutput = {
  normalizedEntries?: Array<{ id: string; concept: string; intent: string; polarity: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'; topics: string[]; normalizedMeaning: string; confidence: number }>;
  matches?: Array<Omit<SemanticEvaluation, 'model'>>;
};

@Injectable()
export class SemanticMatchService {
  private readonly logger = new Logger(SemanticMatchService.name);
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, @Inject(LLM_PROVIDER) private readonly llm: LlmProvider) {}

  enabled(): boolean {
    return this.config.get<boolean>('SEMANTIC_MATCHING_ENABLED', false) && Boolean(this.config.get<string>('LLM_API_KEY', ''));
  }

  candidateLimit(): number { return this.config.get<number>('SEMANTIC_MATCHING_CANDIDATE_LIMIT', 10); }
  weight(): number { return this.config.get<number>('SEMANTIC_MATCHING_WEIGHT', 0.55); }

  async evaluate(userId: string, mine: SemanticEntry[], candidates: SemanticCandidate[]): Promise<Map<string, SemanticEvaluation> | null> {
    if (!this.enabled() || !candidates.length) return null;
    const version = this.config.get<string>('SEMANTIC_MATCHING_PROMPT_VERSION', 'v1');
    const identified = [
      ...mine.map((entry, index) => ({ ...entry, semanticId: entry.id ?? `mine-${index}` })),
      ...candidates.flatMap((candidate) => candidate.entries.map((entry, index) => ({ ...entry, semanticId: entry.id ?? `${candidate.id}-${index}` }))),
    ];
    const payload = {
      profile: mine.map((entry, index) => this.publicEntry(entry, entry.id ?? `mine-${index}`)),
      candidates: candidates.map((candidate) => ({ id: candidate.id, baseScore: candidate.baseScore, entries: candidate.entries.map((entry, index) => this.publicEntry(entry, entry.id ?? `${candidate.id}-${index}`)) })),
    };
    try {
      const response = await this.llm.complete([
        { role: 'system', content: `You are Soulmeet's multilingual semantic compatibility evaluator. Return one valid JSON object only. Normalize every supplied profile and candidate entry into concept, intent, polarity, topics, normalizedMeaning and confidence. You MUST return exactly one matches item for every supplied candidate id, even when its score is zero or its entries are sparse. Never omit a candidate. Score semantic compatibility from 0 to 100 and provide confidence from 0 to 1. Detect paraphrases across languages and explicit or implicit contradictions, especially boundaries and deal breakers. Do not infer protected or highly sensitive traits. Prompt version: ${version}.` },
        { role: 'user', content: `Analyze every entry and every candidate in the following payload. Return exactly {"normalizedEntries":[{"id":"...","concept":"...","intent":"...","polarity":"POSITIVE|NEGATIVE|NEUTRAL","topics":["..."],"normalizedMeaning":"...","confidence":0.0}],"matches":[{"candidateId":"use-the-exact-supplied-id","semanticScore":0,"confidence":0.0,"compatibleConcepts":["..."],"contradictions":["..."],"reasons":["..."]}]}. The matches array length must equal ${payload.candidates.length}.\n${JSON.stringify(payload)}` },
      ], { json: true, cache: true, temperature: 0, maxTokens: 3000, priority: 'interactive', feature: 'semantic_matching', userId });
      const parsed = JSON.parse(response.content) as ProviderOutput;
      await this.persistNormalized(identified, parsed.normalizedEntries ?? [], response.model, version);
      const allowed = new Set(candidates.map((candidate) => candidate.id));
      const evaluations = (parsed.matches ?? []).filter((item) => allowed.has(item.candidateId) && Number.isFinite(item.semanticScore)).map((item) => ({
        candidateId: item.candidateId,
        semanticScore: Math.max(0, Math.min(100, Math.round(item.semanticScore))),
        confidence: Math.max(0, Math.min(1, Number(item.confidence) || 0)),
        compatibleConcepts: this.strings(item.compatibleConcepts, 12), contradictions: this.strings(item.contradictions, 12), reasons: this.strings(item.reasons, 3), model: response.model,
      }));
      return evaluations.length ? new Map(evaluations.map((item) => [item.candidateId, item])) : null;
    } catch (error) {
      this.logger.warn(`Semantic matching unavailable; deterministic fallback used: ${error instanceof Error ? error.message : 'unknown error'}`);
      return null;
    }
  }

  private publicEntry(entry: SemanticEntry, id: string) { return { id, category: entry.category, key: entry.key, text: entry.normalizedValue ?? entry.value, weight: entry.matchingWeight, ...(entry.semanticData ? { cachedSemantic: entry.semanticData } : {}) }; }
  private hash(entry: SemanticEntry) { return createHash('sha256').update(`${entry.category}\0${entry.key ?? ''}\0${entry.normalizedValue ?? entry.value}`).digest('hex'); }
  private strings(value: unknown, limit: number): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(0, limit) : []; }

  private async persistNormalized(entries: Array<SemanticEntry & { semanticId: string }>, normalized: NonNullable<ProviderOutput['normalizedEntries']>, model: string, version: string) {
    const byId = new Map(normalized.filter((item) => item && typeof item.id === 'string').map((item) => [item.id, item]));
    await Promise.allSettled(entries.filter((entry) => entry.id && byId.has(entry.semanticId) && entry.semanticSourceHash !== this.hash(entry)).map((entry) => this.prisma.soulprintEntry.update({
      where: { id: entry.id! },
      data: { semanticData: byId.get(entry.semanticId)! as unknown as Prisma.InputJsonValue, semanticModel: model, semanticPromptVersion: version, semanticSourceHash: this.hash(entry), semanticAnalyzedAt: new Date() },
    })));
  }
}
