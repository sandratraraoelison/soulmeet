import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface MatchingEntry {
  id: string;
  category: string;
  key: string | null;
  normalizedValue: string | null;
  value: string;
  matchingWeight: number;
  semanticData?: unknown;
  semanticSourceHash?: string | null;
}

export interface MatchingProfile {
  firstName: string;
  city: string;
  country: string;
  occupation: string | null;
  birthDate: Date;
  gender: string;
  interestedInGender: string | null;
}

export interface MatchCandidate {
  id: string;
  profile: MatchingProfile;
  entries: MatchingEntry[];
}

export interface MatchLoad {
  me: MatchCandidate | null;
  eligible: MatchCandidate[];
}

const matchingEntriesSelect: Prisma.Soulprint$entriesArgs = {
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
    semanticData: true,
    semanticSourceHash: true,
  },
};

const matchingUserSelect = {
  id: true,
  profile: true,
  soulprint: { select: { entries: matchingEntriesSelect } },
} satisfies Prisma.UserSelect;

/**
 * Loads the current user and the gender-compatible candidates eligible for
 * matchmaking. Keeps the discovery query and gender rules out of the scoring
 * logic in UsersService.
 */
@Injectable()
export class MatchCandidatesService {
  constructor(private readonly prisma: PrismaService) {}

  async blockedIds(userId: string): Promise<string[]> {
    const blocks = await this.prisma.block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });
    return blocks.map((block) =>
      block.blockerId === userId ? block.blockedId : block.blockerId,
    );
  }

  async loadEligible(currentUserId: string): Promise<MatchLoad> {
    const blockedIds = await this.blockedIds(currentUserId);
    const me = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: matchingUserSelect,
    });
    if (!me?.profile) return { me: null, eligible: [] };
    const candidates = await this.prisma.user.findMany({
      where: {
        id: { notIn: [currentUserId, ...blockedIds] },
        isActive: true,
        profile: { isNot: null },
        soulprint: { isNot: null },
      },
      select: matchingUserSelect,
      take: 50,
    });
    const eligible = candidates.filter(
      (candidate) =>
        candidate.profile &&
        this.genderCompatible(me.profile!, candidate.profile),
    );
    return {
      me: {
        id: me.id,
        profile: me.profile,
        entries: me.soulprint?.entries ?? [],
      },
      eligible: eligible.map((candidate) => ({
        id: candidate.id,
        profile: candidate.profile!,
        entries: candidate.soulprint?.entries ?? [],
      })),
    };
  }

  async loadForUser(userId: string): Promise<MatchCandidate | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: matchingUserSelect,
    });
    if (!user?.profile) return null;
    return {
      id: user.id,
      profile: user.profile,
      entries: user.soulprint?.entries ?? [],
    };
  }

  private genderCompatible(
    me: { gender: string; interestedInGender: string | null },
    candidate: { gender: string; interestedInGender: string | null },
  ): boolean {
    if (!me.interestedInGender || !candidate.interestedInGender) return false;
    const normalize = (gender: string) =>
      ['NON_BINARY', 'NON_GENDERED', 'OTHER', 'PREFER_NOT_TO_SAY'].includes(gender)
        ? 'NON_GENDERED'
        : gender;
    return (
      me.interestedInGender === normalize(candidate.gender) &&
      candidate.interestedInGender === normalize(me.gender)
    );
  }
}
