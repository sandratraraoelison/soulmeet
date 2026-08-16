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
    { category: 'CORE_VALUE', key: 'honesty', normalizedValue: 'honesty', value: 'Honesty', matchingWeight: 90 },
    { category: 'RELATIONSHIP_GOAL', key: 'goal', normalizedValue: 'long term', value: 'A long-term relationship', matchingWeight: 90 },
    { category: 'PERSONALITY', key: 'temperament', normalizedValue: 'warm', value: 'Warm and curious', matchingWeight: 80 },
    { category: 'OTHER', key: 'job', normalizedValue: 'architect', value: 'Architect', matchingWeight: 50 },
    { category: 'OTHER', key: 'appearance', normalizedValue: 'bright smile', value: 'A bright smile and calm presence', matchingWeight: 50 },
  ];

  it('returns only three enriched recommendations evaluated in both directions', async () => {
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
          profile: { ...profile('Me'), gender: 'MALE', interestedInGender: 'FEMALE' },
          soulprint: { entries },
        }),
        findMany: jest.fn().mockResolvedValue(candidates),
      },
    };
    const service = buildService(prisma);
    const result = await service.matches('me');
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      job: 'Architect',
      physicalDescription: 'A bright smile and calm presence',
      personalityDescription: 'Honesty · Warm and curious',
      compatibilityType: 'Long-Term Compatibility',
      mutualRecommendation: true,
    });
    expect(result[0].scoreMin).toBeLessThanOrEqual(result[0].score);
    expect(result[0].scoreMax).toBeGreaterThanOrEqual(result[0].score);
    expect(result[0].reciprocalScore).toEqual(expect.any(Number));
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
          profile: { ...profile('Me'), gender: 'MALE', interestedInGender: 'FEMALE' },
          soulprint: { entries },
        }),
        findMany: jest.fn().mockResolvedValue(candidates),
      },
    };
    const result = await buildService(prisma).matches('me');
    expect(result.map((match) => match.userId)).toEqual(['mutual']);
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
    };
    await expect(buildService(prisma).matches('me')).resolves.toEqual([]);
  });

  function buildService(prisma: any) {
    return new UsersService(
      prisma,
      new MatchCandidatesService(prisma),
      new MatchPersistenceService(prisma),
    );
  }
});
