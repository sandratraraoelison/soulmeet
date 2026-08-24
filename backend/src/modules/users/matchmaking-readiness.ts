import type { PrismaService } from '../../database/prisma.service';

export async function matchmakingReadiness(prisma: PrismaService, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      profile: { select: { onboardingCompleted: true, interestedInGender: true } },
      soulprint: {
        select: {
          entries: {
            where: {
              status: { in: ['ACTIVE', 'CONFIRMED'] },
              sensitivity: { not: 'HIGHLY_SENSITIVE' },
              visibility: { in: ['GUIDANCE_ONLY', 'MATCHING_ALLOWED'] },
              deletedAt: null,
            },
            select: { category: true, confidence: true },
          },
        },
      },
    },
  });
  const entries = user?.soulprint?.entries ?? [];
  const reliable = entries.filter((entry) => entry.confidence >= 0.65);
  const categories = new Set(reliable.map((entry) => entry.category));
  const checks = {
    profile: !!user?.profile?.onboardingCompleted && !!user.profile.interestedInGender,
    relationshipGoal: categories.has('RELATIONSHIP_GOAL'),
    coreValue: categories.has('CORE_VALUE'),
    communication: categories.has('COMMUNICATION_STYLE') || categories.has('EMOTIONAL_NEED'),
    boundary: categories.has('BOUNDARY') || categories.has('DEAL_BREAKER'),
    enoughSignals: reliable.length >= 5,
  };
  const completed = Object.values(checks).filter(Boolean).length;
  const missing = Object.entries(checks).filter(([, value]) => !value).map(([key]) => key);
  return { ready: missing.length === 0, score: Math.round((completed / Object.keys(checks).length) * 100), missing };
}
