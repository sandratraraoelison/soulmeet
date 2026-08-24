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
import { PushNotificationsService } from '../notifications/push-notifications.service';
import { matchmakingReadiness } from './matchmaking-readiness';
import { ChatService } from '../chat/chat.service';

const PRESENTATION_SCORE_MIN = 65;
const INTRODUCTION_TTL_MS = 72 * 60 * 60 * 1000;
const PRESENTATION_CADENCE_MS = 24 * 60 * 60 * 1000;
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
  reciprocalScoreMin: number;
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
    private readonly notifications: PushNotificationsService,
    private readonly chat: ChatService,
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

  async discover(_currentUserId: string, _limit = 12, _offset = 0) {
    // Soulmeet deliberately has no browsable people feed. Candidates remain
    // private until the coach presents one through the introduction lifecycle.
    return [];
  }

  async matches(currentUserId: string) {
    const readiness = await matchmakingReadiness(this.prisma, currentUserId);
    const state = await this.prisma.matchmakingState.upsert({
      where: { userId: currentUserId },
      create: {
        userId: currentUserId,
        status: readiness.ready ? 'READY' : 'LEARNING',
      },
      update: {},
    });
    if (!state.enabledAt) {
      const status = readiness.ready ? 'READY' : 'LEARNING';
      if (state.status !== status) {
        await this.prisma.matchmakingState.update({ where: { userId: currentUserId }, data: { status } });
      }
      return { status, readiness, matches: [] };
    }
    return this.searchAndPresent(currentUserId, readiness);
  }

  async activateMatchmaking(currentUserId: string) {
    const readiness = await matchmakingReadiness(this.prisma, currentUserId);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.soulprintEntry.updateMany({
        where: {
          soulprint: { userId: currentUserId },
          status: { in: ['ACTIVE', 'CONFIRMED'] },
          sensitivity: { not: 'HIGHLY_SENSITIVE' },
          visibility: 'GUIDANCE_ONLY',
        },
        data: { visibility: 'MATCHING_ALLOWED' },
      }),
      this.prisma.matchmakingState.upsert({
        where: { userId: currentUserId },
        create: { userId: currentUserId, status: readiness.ready ? 'SEARCHING' : 'LEARNING', consentedAt: now, ...(readiness.ready ? { enabledAt: now } : {}) },
        update: { status: readiness.ready ? 'SEARCHING' : 'LEARNING', consentedAt: now, ...(readiness.ready ? { enabledAt: now } : {}) },
      }),
    ]);
    if (!readiness.ready) return { status: 'LEARNING', readiness, matches: [] };
    return this.searchAndPresent(currentUserId, readiness);
  }

  async refreshMatchmaking(currentUserId: string) {
    const readiness = await matchmakingReadiness(this.prisma, currentUserId);
    const state = await this.prisma.matchmakingState.findUnique({ where: { userId: currentUserId } });
    if (!state?.enabledAt) return;
    return this.searchAndPresent(currentUserId, readiness);
  }

  private async searchAndPresent(currentUserId: string, readiness: Awaited<ReturnType<typeof matchmakingReadiness>>) {
    const now = new Date();
    await this.prisma.match.updateMany({
      where: { userId: currentUserId, status: 'INTRODUCED', expiresAt: { lt: now }, respondedAt: null },
      data: { status: 'EXPIRED' },
    });
    await this.prisma.matchmakingState.update({ where: { userId: currentUserId }, data: { status: 'SEARCHING', lastSearchedAt: now } });
    const results = await this.calculateMatches(currentUserId);
    const presentable = results.filter(
      (result) => result.scoreMin >= PRESENTATION_SCORE_MIN && result.reciprocalScoreMin >= PRESENTATION_SCORE_MIN,
    );
    if (presentable.length) {
      await this.prisma.match.updateMany({
        where: { userId: currentUserId, status: 'PROPOSED', matchedUserId: { in: presentable.map((item) => item.userId) } },
        data: { status: 'RESERVED' },
      });
    }
    const active = await this.prisma.match.findFirst({
      where: { userId: currentUserId, status: 'INTRODUCED', respondedAt: null },
      orderBy: { introducedAt: 'asc' },
    });
    const connecting = await this.prisma.match.findFirst({
      where: { userId: currentUserId, status: { in: ['MATCHED', 'CONNECTING', 'DATE_PLANNED', 'MET', 'CONTINUING'] } },
      select: { id: true },
    });
    const previousState = await this.prisma.matchmakingState.findUnique({ where: { userId: currentUserId } });
    const cadenceOpen = !previousState?.lastPresentedAt || now.getTime() - previousState.lastPresentedAt.getTime() >= PRESENTATION_CADENCE_MS;
    let introduced = active;
    if (!introduced && !connecting && cadenceOpen && presentable[0]) {
      introduced = await this.prisma.match.update({
        where: { userId_matchedUserId: { userId: currentUserId, matchedUserId: presentable[0].userId } },
        data: { status: 'INTRODUCED', introducedAt: now, expiresAt: new Date(now.getTime() + INTRODUCTION_TTL_MS) },
      });
    }
    const shown = introduced ? results.find((item) => item.userId === introduced!.matchedUserId) : undefined;
    const status = shown || presentable.length ? 'MATCH_READY' : 'NO_MATCH_YET';
    const state = await this.prisma.matchmakingState.update({
      where: { userId: currentUserId },
      data: { status, ...(shown && !active ? { lastPresentedAt: now } : {}) },
    });
    const first = shown;
    if (first) {
      const persisted = await this.prisma.match.findUnique({
        where: { userId_matchedUserId: { userId: currentUserId, matchedUserId: first.userId } },
        select: { id: true },
      });
      if (persisted && state.lastNotifiedMatchId !== persisted.id) {
        await this.notifications.send(currentUserId, 'matchIntroductions', {
          title: 'Your coach found someone',
          body: "I found someone I'd like you to meet.",
          data: { type: 'matchIntroduction', route: '/(app)/soul' },
        });
        await this.prisma.matchmakingState.update({
          where: { userId: currentUserId },
          data: { lastNotifiedMatchId: persisted.id },
        });
      }
    }
    return { status, readiness, matches: shown ? [shown] : [] };
  }

  private async calculateMatches(currentUserId: string) {
    const { me, eligible } = await this.candidates.loadEligible(currentUserId);
    if (!me) return [];
    const asCandidate = (
      candidate: { id: string; profile: MatchingProfile; entries: MatchingEntry[] },
    ) => ({ id: candidate.id, profile: candidate.profile, soulprint: { entries: candidate.entries } });
    const seenProfiles = new Set<string>();
    const distinctEligible = eligible.filter((candidate) => {
      const profile = candidate.profile;
      const fingerprint = [
        profile.firstName,
        profile.birthDate.toISOString().slice(0, 10),
        profile.city,
        profile.country,
        profile.occupation ?? '',
      ].map((value) => value.toLowerCase().trim()).join('|');
      if (seenProfiles.has(fingerprint)) return false;
      seenProfiles.add(fingerprint);
      return true;
    });
    let results: ScoredCandidate[] = distinctEligible
      .map((candidate) => {
        const forward = this.compatibility(me.profile, me.entries, asCandidate(candidate));
        const reverse = this.compatibility(candidate.profile, candidate.entries, asCandidate(me));
        return { ...forward, reciprocalScore: reverse.score, reciprocalScoreMin: reverse.scoreMin };
      })
      .sort((a, b) => b.score - a.score);
    if (this.semantic?.enabled()) {
      results = await this.blendSemantic(currentUserId, me.entries, distinctEligible, results);
    }
    const responded = await this.prisma.match.findMany({
      where: { userId: currentUserId, respondedAt: { not: null } },
      select: { matchedUserId: true },
    });
    const hidden = new Set(responded.map((match) => match.matchedUserId));
    results = results
      .filter((result) => !hidden.has(result.userId))
      .map((result, index) => ({
        ...result,
        coachInsight: this.coachInsight(
          result.name,
          result.compatibilityType,
          result.reasons[0],
          index,
        ),
      }));
    // Persist qualified candidates before lifecycle presentation and notification.
    await this.persistence.persist(currentUserId, results);
    return results;
  }

  async respondToMatch(userId: string, matchedUserId: string, response: 'ACCEPTED' | 'REJECTED') {
    const match = await this.prisma.match.findUnique({
      where: { userId_matchedUserId: { userId, matchedUserId } },
    });
    if (!match) throw new NotFoundException('Recommendation not found');
    const decision = await this.prisma.match.update({
      where: { id: match.id },
      data: { response, respondedAt: new Date(), status: response === 'ACCEPTED' ? 'INTRODUCED' : 'DECLINED' },
    });
    if (response !== 'ACCEPTED') return { decision, mutual: false, conversation: null };
    const reciprocal = await this.prisma.match.findUnique({
      where: { userId_matchedUserId: { userId: matchedUserId, matchedUserId: userId } },
    });
    if (reciprocal?.response !== 'ACCEPTED') return { decision, mutual: false, conversation: null };
    await this.prisma.match.updateMany({
      where: { OR: [{ userId, matchedUserId }, { userId: matchedUserId, matchedUserId: userId }] },
      data: { status: 'CONNECTING' },
    });
    const conversation = await this.chat.startPrivate(userId, matchedUserId);
    return { decision, mutual: true, conversation };
  }

  async matchHistory(userId: string, response?: 'ACCEPTED' | 'REJECTED') {
    const matches = await this.prisma.match.findMany({
      where: { userId, respondedAt: { not: null }, ...(response ? { response } : {}) },
      orderBy: { respondedAt: 'desc' },
      select: {
        matchedUserId: true,
        score: true,
        response: true,
        respondedAt: true,
        matchedUser: {
          select: {
            profile: { select: { firstName: true, birthDate: true, city: true, country: true, occupation: true } },
          },
        },
      },
    });
    return matches.flatMap((match) => {
      const profile = match.matchedUser.profile;
      if (!profile || !match.response || !match.respondedAt) return [];
      return [{
        userId: match.matchedUserId,
        name: profile.firstName,
        age: Math.floor((Date.now() - profile.birthDate.getTime()) / 31_557_600_000),
        city: profile.city,
        country: profile.country,
        job: profile.occupation?.trim() || 'Occupation not shared yet',
        score: match.score,
        response: match.response,
        respondedAt: match.respondedAt,
      }];
    });
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
        const score = Math.round(
          result.score * (1 - semanticWeight) +
            evaluation.semanticScore * semanticWeight,
        );
        const uncertaintyBelow = result.score - result.scoreMin;
        const uncertaintyAbove = result.scoreMax - result.score;
        return {
          ...result,
          score,
          scoreMin: Math.max(0, score - uncertaintyBelow),
          scoreMax: Math.min(100, score + uncertaintyAbove),
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
    const connection = await this.prisma.match.findFirst({
      where: {
        OR: [
          { userId: currentUserId, matchedUserId: userId },
          { userId, matchedUserId: currentUserId },
        ],
        status: { in: ['MATCHED', 'CONNECTING', 'DATE_PLANNED', 'MET', 'CONTINUING'] },
      },
      select: { id: true },
    });
    if (!connection) throw new NotFoundException('Profile not found');
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
            sexualOrientation: true,
            interestedInGender: true,
            occupation: true,
            birthDate: true,
          },
        },
        soulprint: {
          select: {
            entries: {
              where: {
                visibility: 'MATCHING_ALLOWED',
                status: { in: ['ACTIVE', 'CONFIRMED'] },
                deletedAt: null,
              },
              select: {
                id: true,
                category: true,
                key: true,
                normalizedValue: true,
                value: true,
                matchingWeight: true,
                importance: true,
              },
              orderBy: [{ importance: 'desc' }, { updatedAt: 'desc' }],
            },
          },
        },
      },
    });
    if (!user?.profile) throw new NotFoundException('Profile not found');
    const entries: MatchingEntry[] = (user.soulprint?.entries ?? []).map((entry) => ({
      id: entry.id,
      category: entry.category,
      key: entry.key,
      normalizedValue: entry.normalizedValue,
      value: entry.value,
      matchingWeight: entry.matchingWeight,
    }));
    const me = await this.candidates.loadForUser(currentUserId);
    let compatibility: {
      score: number;
      scoreMin: number;
      scoreMax: number;
      compatibilityType: string;
      reasons: string[];
    } | null = null;
    if (me) {
      const result = this.compatibility(me.profile, me.entries, {
        id: user.id,
        profile: user.profile,
        soulprint: { entries },
      });
      compatibility = {
        score: result.score,
        scoreMin: result.scoreMin,
        scoreMax: result.scoreMax,
        compatibilityType: result.compatibilityType,
        reasons: result.reasons,
      };
    }
    const publicEntries = (user.soulprint?.entries ?? []).map((entry) => ({
      category: entry.category,
      value: entry.value,
      importance: entry.importance,
      shared:
        !!me &&
        me.entries.some(
          (mine) =>
            semanticSimilarity(
              mine.normalizedValue ?? mine.value,
              entry.normalizedValue ?? entry.value,
            ).score >= 0.55,
        ),
    }));
    return {
      id: user.id,
      profile: {
        firstName: user.profile.firstName,
        city: user.profile.city,
        country: user.profile.country,
        occupation: user.profile.occupation,
        gender: user.profile.gender,
        sexualOrientation: user.profile.sexualOrientation,
        birthDate: user.profile.birthDate,
      },
      compatibility,
      soulprint: publicEntries,
    };
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
      : 0;
    const sameCity = me.city.toLowerCase() === candidate.profile.city.toLowerCase();
    const sameCountry = me.country.toLowerCase() === candidate.profile.country.toLowerCase();
    const score = Math.min(100, Math.max(0, Math.round(soulScore * 90 + (sameCity ? 10 : sameCountry ? 5 : 0))));
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
      scoreMin: Math.max(0, score - uncertainty),
      scoreMax: Math.min(100, score + uncertainty),
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
        0,
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

  private coachInsight(name: string, type: string, reason: string | undefined, variant: number) {
    const detail = reason ? reason.replace(/^You /, 'You both ').replace(/: /, ' around ') : '';
    const options: Record<string, string[]> = {
      'Safe Compatibility': [
        `${name} may be easy to talk to. You can take it slowly and see how you feel together.`,
        `Things with ${name} may feel calm and clear. A simple conversation is a good place to start.`,
        `Talking with ${name} may feel natural. Notice if you can both be honest and relaxed.`,
      ],
      'Passionate Compatibility': [
        `There may be a strong spark with ${name}. Be open and say what you want clearly.`,
        `${name} could bring a lot of energy. Enjoy it, but do not rush past honest communication.`,
        `You may feel drawn to ${name} quickly. Stay curious and let the connection grow at its own pace.`,
      ],
      'Healing Compatibility': [
        `${name} may make closeness feel easier. Start small and notice whether you feel comfortable.`,
        `This could feel calm in a good way. Give ${name} time and see if trust grows naturally.`,
        `${name} may offer a softer kind of connection. See if you feel safe being yourself.`,
      ],
      'Growth Compatibility': [
        `${name} may see some things differently. That can help you grow if you both stay open.`,
        `You and ${name} may challenge each other. Ask simple questions and listen before judging.`,
        `${name} could bring a new point of view. This may work well if you both stay patient.`,
      ],
      'Long-Term Compatibility': [
        `You and ${name} may want similar things. Talk and see if your everyday lives also fit.`,
        `There is a good base with ${name}. Take time to learn what a real relationship would look like.`,
        `${name} may fit what you want for the future. Start by seeing how you connect in everyday conversation.`,
      ],
    };
    const choices = options[type] ?? [`It may be worth having a simple conversation with ${name}.`];
    const index = variant % choices.length;
    return detail ? `${detail}. ${choices[index]}` : choices[index]!;
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
