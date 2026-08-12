import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

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
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  async findPublicById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async discover(currentUserId: string) {
    const blocks = await this.prisma.block.findMany({
      where: {
        OR: [{ blockerId: currentUserId }, { blockedId: currentUserId }],
      },
      select: { blockerId: true, blockedId: true },
    });
    const excludedIds = blocks.map((block) =>
      block.blockerId === currentUserId ? block.blockedId : block.blockerId,
    );
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
    const blockedIds = await this.blockedIds(currentUserId);
    const me = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: { id: true, profile: true, soulprint: { select: { entries: { where: { visibility: 'MATCHING_ALLOWED', status: { in: ['ACTIVE', 'CONFIRMED'] }, deletedAt: null }, select: { category: true, key: true, normalizedValue: true, value: true, matchingWeight: true } } } } },
    });
    if (!me?.profile) return [];
    const candidates = await this.prisma.user.findMany({
      where: { id: { notIn: [currentUserId, ...blockedIds] }, isActive: true, profile: { isNot: null }, soulprint: { isNot: null } },
      select: { id: true, profile: true, soulprint: { select: { entries: { where: { visibility: 'MATCHING_ALLOWED', status: { in: ['ACTIVE', 'CONFIRMED'] }, deletedAt: null }, select: { category: true, key: true, normalizedValue: true, value: true, matchingWeight: true } } } } },
      take: 50,
    });
    return candidates
      .filter((candidate) => candidate.profile && this.genderCompatible(me.profile!, candidate.profile))
      .map((candidate) => {
        const forward = this.compatibility(me.profile!, me.soulprint?.entries ?? [], candidate as never);
        const reverse = this.compatibility(candidate.profile!, candidate.soulprint?.entries ?? [], {
          id: me.id, profile: me.profile!, soulprint: { entries: me.soulprint?.entries ?? [] },
        } as never);
        return { ...forward, reciprocalScore: reverse.score, mutualRecommendation: true };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
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
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Profile not found');
    return user;
  }

  private async blockedIds(userId: string) {
    const blocks = await this.prisma.block.findMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] }, select: { blockerId: true, blockedId: true } });
    return blocks.map((block) => block.blockerId === userId ? block.blockedId : block.blockerId);
  }

  private genderCompatible(me: { gender: string; interestedInGender: string | null }, candidate: { gender: string; interestedInGender: string | null }) {
    if (!me.interestedInGender || !candidate.interestedInGender) return false;
    const normalize = (gender: string) => ['NON_BINARY', 'NON_GENDERED', 'OTHER', 'PREFER_NOT_TO_SAY'].includes(gender) ? 'NON_GENDERED' : gender;
    return me.interestedInGender === normalize(candidate.gender)
      && candidate.interestedInGender === normalize(me.gender);
  }

  private compatibility(me: { city: string; country: string; birthDate: Date }, mine: { category: string; key: string | null; normalizedValue: string | null; value: string; matchingWeight: number }[], candidate: { id: string; profile: { firstName: string; city: string; country: string; birthDate: Date }; soulprint: { entries: { category: string; key: string | null; normalizedValue: string | null; value: string; matchingWeight: number }[] } }) {
    const weights: Record<string, number> = { CORE_VALUE: 1.5, RELATIONSHIP_GOAL: 1.5, COMMUNICATION_STYLE: 1.3, EMOTIONAL_NEED: 1.25, INTEREST: 1, LIFESTYLE: 1, LOVE_LANGUAGE: 1.2 };
    const tokens = (value: string) => new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2));
    const reasons: string[] = [];
    const matchedCategories = new Set<string>();
    let earned = 0; let possible = 0;
    for (const left of mine) {
      const categoryWeight = weights[left.category] ?? 0.65;
      const rightEntries = candidate.soulprint.entries.filter((entry) => entry.category === left.category);
      possible += categoryWeight;
      const leftTokens = tokens(left.normalizedValue ?? left.value);
      const match = rightEntries.find((right) => [...tokens(right.normalizedValue ?? right.value)].some((token) => leftTokens.has(token)));
      if (match) { earned += categoryWeight * ((left.matchingWeight + match.matchingWeight) / 200); matchedCategories.add(left.category); if (reasons.length < 3) reasons.push(this.reason(left.category, match.value)); }
    }
    const soulScore = possible ? earned / possible : 0.35;
    const sameCity = me.city.toLowerCase() === candidate.profile.city.toLowerCase();
    const sameCountry = me.country.toLowerCase() === candidate.profile.country.toLowerCase();
    const score = Math.min(96, Math.max(48, Math.round(52 + soulScore * 38 + (sameCity ? 6 : sameCountry ? 3 : 0))));
    const age = Math.floor((Date.now() - candidate.profile.birthDate.getTime()) / 31_557_600_000);
    const compatibilityType = this.compatibilityType(matchedCategories, score);
    const evidence = Math.min(mine.length, candidate.soulprint.entries.length, 8);
    const uncertainty = evidence >= 6 ? 5 : evidence >= 3 ? 9 : 14;
    const personalityDescription = this.persona(candidate.soulprint.entries);
    return {
      userId: candidate.id,
      name: candidate.profile.firstName,
      age,
      job: this.sharedDetail(candidate.soulprint.entries, ['job', 'occupation', 'profession', 'career']) ?? 'Profession not shared yet',
      city: candidate.profile.city,
      country: candidate.profile.country,
      score,
      scoreMin: Math.max(40, score - uncertainty),
      scoreMax: Math.min(98, score + uncertainty),
      compatibilityType,
      physicalDescription: this.sharedDetail(candidate.soulprint.entries, ['physical-description', 'physical_description', 'appearance', 'look']) ?? 'A presence you can discover through conversation.',
      personalityDescription,
      reasons: reasons.length ? reasons : ['Your relationship preferences leave room to explore this connection.'],
      impression: sameCity ? `A compatible soul close to you in ${candidate.profile.city}.` : `A thoughtful connection from ${candidate.profile.city}.`,
      persona: personalityDescription,
      coachInsight: this.coachInsight(candidate.profile.firstName, compatibilityType, reasons[0]),
    };
  }

  private compatibilityType(categories: Set<string>, score: number) {
    if (categories.has('RELATIONSHIP_GOAL') && categories.has('CORE_VALUE')) return 'Long-Term Compatibility';
    if (categories.has('EMOTIONAL_NEED') && categories.has('COMMUNICATION_STYLE')) return 'Safe Compatibility';
    if (categories.has('CHALLENGE') || categories.has('STRENGTH')) return 'Growth Compatibility';
    if (categories.has('INTEREST') && score >= 75) return 'Passionate Compatibility';
    return score >= 80 ? 'Healing Compatibility' : 'Growth Compatibility';
  }

  private sharedDetail(entries: { key: string | null; value: string }[], keys: string[]) {
    const normalized = new Set(keys.map((key) => key.toLowerCase()));
    return entries.find((entry) => entry.key && normalized.has(entry.key.toLowerCase()))?.value;
  }

  private coachInsight(name: string, type: string, reason?: string) {
    const lead = reason ?? 'Your profiles show meaningful common ground.';
    const endings: Record<string, string> = {
      'Safe Compatibility': `${name} may bring a kind of steadiness that still leaves room for playfulness and emotional depth.`,
      'Passionate Compatibility': 'There is real intensity here. It could feel electric, as long as both of you communicate clearly instead of guessing.',
      'Healing Compatibility': 'This connection could feel reassuring without becoming flat—a chance to experience closeness with more ease.',
      'Growth Compatibility': 'You may challenge each other in useful ways. The potential is strong if curiosity stays bigger than defensiveness.',
      'Long-Term Compatibility': 'This has the foundations of something healthy and lasting, even if the first spark feels quieter than chaos.',
    };
    return `${lead} ${endings[type]}`;
  }

  private reason(category: string, value: string) {
    const labels: Record<string, string> = { CORE_VALUE: 'You share an important value', INTEREST: 'You have a common interest', RELATIONSHIP_GOAL: 'Your relationship goals align', COMMUNICATION_STYLE: 'Your communication styles connect', EMOTIONAL_NEED: 'Your emotional needs may complement each other', LIFESTYLE: 'Your lifestyles have common ground', LOVE_LANGUAGE: 'You express care in compatible ways' };
    return `${labels[category] ?? 'Your Soulprints share common ground'}: ${value}`;
  }

  private persona(entries: { category: string; value: string }[]) {
    const values = entries.filter((entry) => ['PERSONALITY', 'CORE_VALUE', 'STRENGTH'].includes(entry.category)).slice(0, 3).map((entry) => entry.value);
    return values.length ? values.join(' · ') : 'Curious, open, and ready for a meaningful connection.';
  }
}
