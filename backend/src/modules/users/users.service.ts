import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { semanticSimilarity } from './semantic-similarity.util';
import { SemanticMatchService } from './semantic-match.service';
import {
  MatchCandidatesService,
  MatchingEntry,
  MatchingProfile,
} from './match-candidates.service';
import { MatchPersistenceService } from './match-persistence.service';

const publicUserSelect = {
  id: true,
  email: true,
  authProvider: true,
  role: true,
  isActive: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
  twoFactorEnabled: true,
} as const;

export interface CompatibilityResult {
  userId: string;
  name: string;
  age: number;
  job: string;
  city: string;
  country: string;
  score: number;
  scoreMin: number;
  scoreMax: number;
  compatibilityType: string;
  physicalDescription: string;
  personalityDescription: string;
  reasons: string[];
  impression: string;
  persona: string;
  coachInsight: string;
}

type ScoredCandidate = CompatibilityResult & {
  reciprocalScore: number;
  mutualRecommendation: boolean;
};

type EnrichedCandidate = ScoredCandidate & {
  semanticScore?: number;
  semanticConfidence?: number;
  semanticModel?: string;
  semanticAnalysis?: unknown;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly candidates: MatchCandidatesService,
    private readonly persistence: MatchPersistenceService,
    private readonly semantic?: SemanticMatchService,
  ) {}

  async findPublicById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async discover(currentUserId: string) {
    const excludedIds = await this.candidates.blockedIds(currentUserId);
    return this.prisma.user.findMany({
      where: {
        id: { notIn: [currentUserId, ...excludedIds] },
        isActive: true,
        profile: { isNot: null },
      },
      select: {
        id: true,
        profile: {
          select: { firstName: true, city: true, country: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async matches(currentUserId: string) {
    const { me, eligible } = await this.candidates.loadEligible(currentUserId);
    if (!me) return [];
    const asCandidate = (
      candidate: { id: string; profile: MatchingProfile; entries: MatchingEntry[] },
    ) => ({ id: candidate.id, profile: candidate.profile, soulprint: { entries: candidate.entries } });
    let results: ScoredCandidate[] = eligible
      .map((candidate) => {
        const forward = this.compatibility(me.profile, me.entries, asCandidate(candidate));
        const reverse = this.compatibility(candidate.profile, candidate.entries, asCandidate(me));
        return { ...forward, reciprocalScore: reverse.score, mutualRecommendation: true };
      })
      .sort((a, b) => b.score - a.score);
    if (this.semantic?.enabled()) {
      results = await this.blendSemantic(currentUserId, me.entries, eligible, results);
    }
    results = results.slice(0, 3);
    // Persist recommendations so the admin dashboard can surface match history.
    await this.persistence.persist(currentUserId, results);
    return results;
  }

  private async blendSemantic(
    currentUserId: string,
    myEntries: MatchingEntry[],
    eligible: { id: string; entries: MatchingEntry[] }[],
    results: ScoredCandidate[],
  ): Promise<EnrichedCandidate[]> {
    const limit = this.semantic!.candidateLimit();
    const shortlist = results.slice(0, limit);
    const candidateById = new Map(eligible.map((candidate) => [candidate.id, candidate]));
    const evaluations = await this.semantic!.evaluate(
      currentUserId,
      myEntries,
      shortlist.map((result) => ({
        id: result.userId,
        baseScore: result.score,
        entries: candidateById.get(result.userId)?.entries ?? [],
      })),
    );
    if (!evaluations) return results;
    const semanticWeight = this.semantic!.weight();
    return results
      .map((result) => {
        const evaluation = evaluations.get(result.userId);
        if (!evaluation) return result;
        return {
          ...result,
          score: Math.round(
            result.score * (1 - semanticWeight) +
              evaluation.semanticScore * semanticWeight,
          ),
          reasons: evaluation.reasons.length ? evaluation.reasons : result.reasons,
          semanticScore: evaluation.semanticScore,
          semanticConfidence: evaluation.confidence,
          semanticModel: evaluation.model,
          semanticAnalysis: {
            compatibleConcepts: evaluation.compatibleConcepts,
            contradictions: evaluation.contradictions,
          },
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  async findPublicProfile(currentUserId: string, userId: string) {
    const blocked = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: currentUserId, blockedId: userId },
          { blockerId: userId, blockedId: currentUserId },
        ],
      },
    });
    if (blocked) throw new NotFoundException('Profile not found');
    const user = await this.prisma.user.findFirst({
      where: { id: userId, isActive: true, profile: { isNot: null } },
      select: {
        id: true,
        profile: {
          select: {
            firstName: true,
            city: true,
            country: true,
            gender: true,
            occupation: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Profile not found');
    return user;
  }

  private compatibility(
    me: { city: string; country: string },
    mine: MatchingEntry[],
    candidate: {
      id: string;
      profile: MatchingProfile;
      soulprint: { entries: MatchingEntry[] };
    },
  ): CompatibilityResult {
    const weights: Record<string, number> = {
      CORE_VALUE: 1.5,
      RELATIONSHIP_GOAL: 1.5,
      COMMUNICATION_STYLE: 1.3,
      EMOTIONAL_NEED: 1.25,
      INTEREST: 1,
      LIFESTYLE: 1,
      LOVE_LANGUAGE: 1.2,
    };
    const reasons: string[] = [];
    const matchedCategories = new Set<string>();
    let earned = 0;
    let possible = 0;
    let contradictions = 0;
    for (const left of mine) {
      const categoryWeight = weights[left.category] ?? 0.65;
      const rightEntries = candidate.soulprint.entries.filter(
        (entry) => entry.category === left.category,
      );
      possible += categoryWeight;
      const comparisons = rightEntries.map((right) => ({
        right,
        ...semanticSimilarity(
          left.normalizedValue ?? left.value,
          right.normalizedValue ?? right.value,
        ),
      }));
      const best = comparisons.sort((a, b) => b.score - a.score)[0];
      if (comparisons.some((comparison) => comparison.contradiction))
        contradictions++;
      if (best && best.score >= 0.3) {
        earned +=
          categoryWeight * ((left.matchingWeight + best.right.matchingWeight) / 200) * best.score;
        matchedCategories.add(left.category);
        if (reasons.length < 3)
          reasons.push(this.reason(left.category, best.right.value));
      }
    }
    const dealBreakers = mine.filter((entry) => entry.category === 'DEAL_BREAKER');
    for (const dealBreaker of dealBreakers) {
      if (
        candidate.soulprint.entries.some(
          (entry) =>
            entry.category !== 'DEAL_BREAKER' &&
            semanticSimilarity(
              dealBreaker.normalizedValue ?? dealBreaker.value,
              entry.normalizedValue ?? entry.value,
            ).score >= 0.55,
        )
      )
        contradictions += 2;
    }
    const soulScore = possible
      ? Math.max(0, earned / possible - Math.min(0.45, contradictions * 0.12))
      : 0.35;
    const sameCity = me.city.toLowerCase() === candidate.profile.city.toLowerCase();
    const sameCountry = me.country.toLowerCase() === candidate.profile.country.toLowerCase();
    const score = Math.min(
      96,
      Math.max(
        48,
        Math.round(52 + soulScore * 38 + (sameCity ? 6 : sameCountry ? 3 : 0)),
      ),
    );
    const age = Math.floor(
      (Date.now() - candidate.profile.birthDate.getTime()) / 31_557_600_000,
    );
    const compatibilityType = this.compatibilityType(matchedCategories, score);
    const evidence = Math.min(mine.length, candidate.soulprint.entries.length, 8);
    const uncertainty =
      (evidence >= 6 ? 5 : evidence >= 3 ? 9 : 14) + (contradictions ? 2 : 0);
    const personalityDescription = this.persona(candidate.soulprint.entries);
    return {
      userId: candidate.id,
      name: candidate.profile.firstName,
      age,
      job:
        candidate.profile.occupation?.trim() ||
        this.sharedDetail(candidate.soulprint.entries, [
          'job',
          'occupation',
          'profession',
          'career',
        ]) ||
        'Occupation not shared yet',
      city: candidate.profile.city,
      country: candidate.profile.country,
      score,
      scoreMin: Math.max(40, score - uncertainty),
      scoreMax: Math.min(98, score + uncertainty),
      compatibilityType,
      physicalDescription: this.sharedDetail(candidate.soulprint.entries, [
        'physical-description',
        'physical_description',
        'appearance',
        'look',
      ]) ?? 'A presence you can discover through conversation.',
      personalityDescription,
      reasons: reasons.length
        ? reasons
        : ['Your relationship preferences leave room to explore this connection.'],
      impression: sameCity
        ? `A compatible soul close to you in ${candidate.profile.city}.`
        : `A thoughtful connection from ${candidate.profile.city}.`,
      persona: personalityDescription,
      coachInsight: this.coachInsight(
        candidate.profile.firstName,
        compatibilityType,
        reasons[0],
      ),
    };
  }

  private compatibilityType(categories: Set<string>, score: number) {
    if (categories.has('RELATIONSHIP_GOAL') && categories.has('CORE_VALUE'))
      return 'Long-Term Compatibility';
    if (categories.has('EMOTIONAL_NEED') && categories.has('COMMUNICATION_STYLE'))
      return 'Safe Compatibility';
    if (categories.has('CHALLENGE') || categories.has('STRENGTH'))
      return 'Growth Compatibility';
    if (categories.has('INTEREST') && score >= 75) return 'Passionate Compatibility';
    return score >= 80 ? 'Healing Compatibility' : 'Growth Compatibility';
  }

  private sharedDetail(
    entries: { key: string | null; value: string }[],
    keys: string[],
  ) {
    const normalized = new Set(keys.map((key) => key.toLowerCase()));
    return entries.find(
      (entry) => entry.key && normalized.has(entry.key.toLowerCase()),
    )?.value;
  }

  private coachInsight(name: string, type: string, reason?: string) {
    const lead =
      reason ?? 'Your profiles show meaningful common ground.';
    const endings: Record<string, string> = {
      'Safe Compatibility': `${name} may bring a kind of steadiness that still leaves room for playfulness and emotional depth.`,
      'Passionate Compatibility':
        'There is real intensity here. It could feel electric, as long as both of you communicate clearly instead of guessing.',
      'Healing Compatibility':
        'This connection could feel reassuring without becoming flat—a chance to experience closeness with more ease.',
      'Growth Compatibility':
        'You may challenge each other in useful ways. The potential is strong if curiosity stays bigger than defensiveness.',
      'Long-Term Compatibility':
        'This has the foundations of something healthy and lasting, even if the first spark feels quieter than chaos.',
    };
    return `${lead} ${endings[type]}`;
  }

  private reason(category: string, value: string) {
    const labels: Record<string, string> = {
      CORE_VALUE: 'You share an important value',
      INTEREST: 'You have a common interest',
      RELATIONSHIP_GOAL: 'Your relationship goals align',
      COMMUNICATION_STYLE: 'Your communication styles connect',
      EMOTIONAL_NEED: 'Your emotional needs may complement each other',
      LIFESTYLE: 'Your lifestyles have common ground',
      LOVE_LANGUAGE: 'You express care in compatible ways',
    };
    return `${labels[category] ?? 'Your Soulprints share common ground'}: ${value}`;
  }

  private persona(entries: { category: string; value: string }[]) {
    const values = entries
      .filter((entry) => ['PERSONALITY', 'CORE_VALUE', 'STRENGTH'].includes(entry.category))
      .slice(0, 3)
      .map((entry) => entry.value);
    return values.length
      ? values.join(' · ')
      : 'Curious, open, and ready for a meaningful connection.';
  }
}
