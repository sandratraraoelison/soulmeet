import { UsersService } from '../src/modules/users/users.service';
import { MatchCandidatesService } from '../src/modules/users/match-candidates.service';
import { MatchPersistenceService } from '../src/modules/users/match-persistence.service';

describe('UsersService matchmaking', () => {
  const profile = (firstName: string) => ({
    firstName,
    city: 'Paris',
    country: 'France',
    birthDate: new Date('1998-01-01'),
    gender: 'FEMALE',
    interestedInGender: 'MALE',
  });
  const entries = [
    { category: 'CORE_VALUE', key: 'honesty', normalizedValue: 'honesty', value: 'Honesty', matchingWeight: 90, confidence: 1 },
    { category: 'RELATIONSHIP_GOAL', key: 'goal', normalizedValue: 'long term', value: 'A long-term relationship', matchingWeight: 90, confidence: 1 },
    { category: 'COMMUNICATION_STYLE', key: 'communication', normalizedValue: 'direct', value: 'Direct communication', matchingWeight: 80, confidence: 1 },
    { category: 'BOUNDARY', key: 'boundary', normalizedValue: 'respect', value: 'Respect my time', matchingWeight: 80, confidence: 1 },
    { category: 'PERSONALITY', key: 'temperament', normalizedValue: 'warm', value: 'Warm and curious', matchingWeight: 80, confidence: 1 },
    { category: 'OTHER', key: 'job', normalizedValue: 'architect', value: 'Architect', matchingWeight: 50, confidence: 1 },
    { category: 'OTHER', key: 'appearance', normalizedValue: 'bright smile', value: 'A bright smile and calm presence', matchingWeight: 50, confidence: 1 },
  ];

  it('presents only the best qualified recommendation and keeps the rest reserved', async () => {
    const candidates = ['Julia', 'Caro', 'Tiphaine', 'Maya'].map((name, index) => ({
      id: `candidate-${index}`,
      profile: profile(name),
      soulprint: { entries },
    }));
    const prisma = {
      block: { findMany: jest.fn().mockResolvedValue([]) },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'me',
          profile: { ...profile('Me'), gender: 'MALE', interestedInGender: 'FEMALE', onboardingCompleted: true },
          soulprint: { entries },
        }),
        findMany: jest.fn().mockResolvedValue(candidates),
      },
    };
    const service = buildService(prisma);
    const result = await service.matches('me');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]).toMatchObject({
      job: 'Architect',
      physicalDescription: 'A bright smile and calm presence',
      personalityDescription: 'Honesty · Warm and curious',
      compatibilityType: 'Long-Term Compatibility',
    });
    expect(result.matches[0].scoreMin).toBeLessThanOrEqual(result.matches[0].score);
    expect(result.matches[0].scoreMax).toBeGreaterThanOrEqual(result.matches[0].score);
    expect(result.matches[0].reciprocalScore).toEqual(expect.any(Number));
    expect((prisma as any).match.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'RESERVED' } }));
  });

  it('does not show cloned profiles more than once', async () => {
    const clonedProfile = profile('Same person');
    const prisma = {
      block: { findMany: jest.fn().mockResolvedValue([]) },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'me',
          profile: { ...profile('Me'), gender: 'MALE', interestedInGender: 'FEMALE', onboardingCompleted: true },
          soulprint: { entries },
        }),
        findMany: jest.fn().mockResolvedValue([
          { id: 'clone-one', profile: clonedProfile, soulprint: { entries } },
          { id: 'clone-two', profile: clonedProfile, soulprint: { entries } },
        ]),
      },
    };
    await expect(buildService(prisma).matches('me')).resolves.toMatchObject({ matches: [{ userId: 'clone-one' }] });
  });

  it('keeps only candidates whose gender preferences match in both directions', async () => {
    const candidates = [
      { id: 'mutual', profile: profile('Mutual'), soulprint: { entries } },
      { id: 'wrong-gender', profile: { ...profile('Wrong gender'), gender: 'MALE' }, soulprint: { entries } },
      { id: 'not-interested-in-me', profile: { ...profile('Not interested'), interestedInGender: 'FEMALE' }, soulprint: { entries } },
      { id: 'missing-preference', profile: { ...profile('Missing preference'), interestedInGender: null }, soulprint: { entries } },
    ];
    const prisma = {
      block: { findMany: jest.fn().mockResolvedValue([]) },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'me',
          profile: { ...profile('Me'), gender: 'MALE', interestedInGender: 'FEMALE', onboardingCompleted: true },
          soulprint: { entries },
        }),
        findMany: jest.fn().mockResolvedValue(candidates),
      },
    };
    const result = await buildService(prisma).matches('me');
    expect(result.matches.map((match) => match.userId)).toEqual(['mutual']);
  });

  it('returns no suggestions until the user chooses who they are interested in', async () => {
    const prisma = {
      block: { findMany: jest.fn().mockResolvedValue([]) },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'me', profile: { ...profile('Me'), gender: 'MALE', interestedInGender: null }, soulprint: { entries },
        }),
        findMany: jest.fn().mockResolvedValue([{ id: 'candidate', profile: profile('Julia'), soulprint: { entries } }]),
      },
      matchmakingState: {
        upsert: jest.fn().mockResolvedValue({ status: 'LEARNING', enabledAt: null, lastNotifiedMatchId: null }),
        update: jest.fn(),
      },
    };
    await expect(buildService(prisma).matches('me')).resolves.toMatchObject({ status: 'LEARNING', matches: [] });
  });

  function buildService(prisma: any) {
    prisma.match ??= {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      update: jest.fn().mockImplementation(({ where }: any) => Promise.resolve({
        id: 'introduced-match',
        matchedUserId: where.userId_matchedUserId?.matchedUserId,
      })),
      upsert: jest.fn(),
    };
    prisma.matchmakingState ??= {
      upsert: jest.fn().mockResolvedValue({ status: 'SEARCHING', enabledAt: new Date(), lastNotifiedMatchId: null }),
      findUnique: jest.fn().mockResolvedValue({ status: 'SEARCHING', enabledAt: new Date(), lastPresentedAt: null, lastNotifiedMatchId: null }),
      update: jest.fn().mockResolvedValue({ status: 'MATCH_READY', enabledAt: new Date(), lastNotifiedMatchId: null }),
    };
    prisma.soulprintEntry ??= { updateMany: jest.fn() };
    prisma.$transaction ??= jest.fn((operations: unknown[]) => Promise.all(operations));
    return new UsersService(
      prisma,
      new MatchCandidatesService(prisma),
      new MatchPersistenceService(prisma),
      { send: jest.fn() } as any,
      { startPrivate: jest.fn() } as any,
    );
  }
});
