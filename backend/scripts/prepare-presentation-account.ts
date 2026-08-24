import {
  CoachGender,
  CoachPersonality,
  Gender,
  GrowthGoalStatus,
  GuidanceConversationStatus,
  GuidanceMessageRole,
  InterestGender,
  PrismaClient,
  SexualOrientation,
  SoulprintCategory,
} from '@prisma/client';

const prisma = new PrismaClient();
const email = (process.env.PRESENTATION_ACCOUNT_EMAIL ?? 'johndeep@yopmail.com').trim().toLowerCase();
const matchEmail = (process.env.PRESENTATION_MATCH_EMAIL ?? 'sofialee@yopmail.com').trim().toLowerCase();

const soulprintEntries = [
  ['PERSONALITY', 'thoughtful', 'Thoughtful, curious, and attentive to other people'],
  ['PERSONALITY', 'optimistic', 'Approaches new connections with warmth and optimism'],
  ['CORE_VALUE', 'honesty', 'Values honesty and emotional transparency'],
  ['CORE_VALUE', 'kindness', 'Values kindness, respect, and mutual support'],
  ['INTEREST', 'photography', 'Enjoys photography and noticing meaningful details'],
  ['INTEREST', 'travel', 'Enjoys travel, culture, and discovering new places'],
  ['RELATIONSHIP_GOAL', 'long-term', 'Wants a committed, healthy long-term relationship'],
  ['COMMUNICATION_STYLE', 'calm-direct', 'Prefers calm, clear, and direct communication'],
  ['EMOTIONAL_NEED', 'consistency', 'Feels secure with consistency and thoughtful follow-through'],
  ['LOVE_LANGUAGE', 'quality-time', 'Feels connected through intentional quality time'],
  ['BOUNDARY', 'respectful-space', 'Needs personal boundaries and quiet time to be respected'],
  ['PARTNER_PREFERENCE', 'emotionally-available', 'Looks for emotional availability, curiosity, and kindness'],
] as const;

async function main() {
  const user = await prisma.user.findUnique({ where: { email }, include: { profile: true } });
  if (!user) {
    throw new Error(`Account ${email} does not exist. Register it first, then run this script again.`);
  }

  const gender = Gender.MALE;
  const interestedInGender = InterestGender.FEMALE;

  await prisma.user.update({
    where: { id: user.id },
    data: { isActive: true, accountStatus: 'ACTIVE', emailVerified: true },
  });

  await prisma.profile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      firstName: 'John',
      birthDate: new Date('1995-06-27'),
      gender,
      sexualOrientation: SexualOrientation.HETEROSEXUAL,
      interestedInGender,
      country: 'South Korea',
      city: 'Daejeon',
      occupation: 'Product photographer',
      onboardingCompleted: true,
    },
    update: {
      gender,
      sexualOrientation: SexualOrientation.HETEROSEXUAL,
      interestedInGender,
      onboardingCompleted: true,
      ...(!user.profile?.occupation ? { occupation: 'Product photographer' } : {}),
    },
  });

  await prisma.coach.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      name: 'Giovanni',
      gender: CoachGender.MALE,
      personality: CoachPersonality.EMPATHETIC,
      traits: [
        CoachPersonality.FRIENDLY,
        CoachPersonality.EMPATHETIC,
        CoachPersonality.DATING_EXPERT,
        CoachPersonality.DIRECT,
      ],
      appearance: 'mateo',
      speakingStyle: 'Warm, conversational, and encouraging',
      adviceStyle: 'Practical, honest, and reflective',
      customInstructions: 'Help me build confidence, communicate clearly, and make intentional dating choices.',
      humorLevel: 58,
      empathyLevel: 86,
      directnessLevel: 68,
      energyLevel: 64,
    },
    update: {
      name: 'Giovanni',
      traits: [
        CoachPersonality.FRIENDLY,
        CoachPersonality.EMPATHETIC,
        CoachPersonality.DATING_EXPERT,
        CoachPersonality.DIRECT,
      ],
      speakingStyle: 'Warm, conversational, and encouraging',
      adviceStyle: 'Practical, honest, and reflective',
      empathyLevel: 86,
      directnessLevel: 68,
    },
  });

  const soulprint = await prisma.soulprint.upsert({
    where: { userId: user.id },
    create: { userId: user.id, completenessScore: 88 },
    update: { completenessScore: 88 },
  });

  for (const [category, normalizedValue, value] of soulprintEntries) {
    const fingerprint = `presentation:${category}:${normalizedValue}`;
    await prisma.soulprintEntry.upsert({
      where: { soulprintId_fingerprint: { soulprintId: soulprint.id, fingerprint } },
      create: {
        soulprintId: soulprint.id,
        category: category as SoulprintCategory,
        key: normalizedValue,
        value,
        normalizedValue,
        fingerprint,
        source: 'USER_CONFIRMED',
        status: 'CONFIRMED',
        visibility: 'MATCHING_ALLOWED',
        sensitivity: 'NORMAL',
        confidence: 1,
        importance: 80,
        matchingWeight: 85,
        confirmedAt: new Date(),
      },
      update: {
        value,
        normalizedValue,
        status: 'CONFIRMED',
        visibility: 'MATCHING_ALLOWED',
        confidence: 1,
        matchingWeight: 85,
        deletedAt: null,
      },
    });
  }

  const matchUser = await prisma.user.findUnique({ where: { email: matchEmail } });
  if (!matchUser) {
    throw new Error(`Match account ${matchEmail} does not exist. Register it first, then run this script again.`);
  }
  await prisma.user.update({
    where: { id: matchUser.id },
    data: { isActive: true, accountStatus: 'ACTIVE', emailVerified: true },
  });
  await prisma.profile.upsert({
    where: { userId: matchUser.id },
    create: {
      userId: matchUser.id,
      firstName: 'Sofia',
      birthDate: new Date('1997-09-18'),
      gender: Gender.FEMALE,
      sexualOrientation: SexualOrientation.HETEROSEXUAL,
      interestedInGender: InterestGender.MALE,
      country: user.profile?.country ?? 'South Korea',
      city: user.profile?.city ?? 'Daejeon',
      occupation: 'Interior designer',
      onboardingCompleted: true,
    },
    update: {
      gender: Gender.FEMALE,
      interestedInGender: InterestGender.MALE,
      country: user.profile?.country ?? 'South Korea',
      city: user.profile?.city ?? 'Daejeon',
      onboardingCompleted: true,
    },
  });
  const matchSoulprint = await prisma.soulprint.upsert({
    where: { userId: matchUser.id },
    create: { userId: matchUser.id, completenessScore: 86 },
    update: { completenessScore: 86 },
  });
  for (const [category, normalizedValue, value] of soulprintEntries) {
    const fingerprint = `presentation-match:${category}:${normalizedValue}`;
    await prisma.soulprintEntry.upsert({
      where: { soulprintId_fingerprint: { soulprintId: matchSoulprint.id, fingerprint } },
      create: {
        soulprintId: matchSoulprint.id,
        category: category as SoulprintCategory,
        key: normalizedValue,
        value,
        normalizedValue,
        fingerprint,
        source: 'USER_CONFIRMED',
        status: 'CONFIRMED',
        visibility: 'MATCHING_ALLOWED',
        sensitivity: 'NORMAL',
        confidence: 1,
        importance: 80,
        matchingWeight: 90,
        confirmedAt: new Date(),
      },
      update: {
        value,
        normalizedValue,
        status: 'CONFIRMED',
        visibility: 'MATCHING_ALLOWED',
        confidence: 1,
        matchingWeight: 90,
        deletedAt: null,
      },
    });
  }

  const demoConversation = await prisma.guidanceConversation.findFirst({
    where: { userId: user.id, title: 'Presentation conversation' },
  });
  if (!demoConversation) {
    await prisma.guidanceConversation.create({
      data: {
        userId: user.id,
        title: 'Presentation conversation',
        status: GuidanceConversationStatus.ACTIVE,
        lastMessageAt: new Date(),
        messages: {
          create: [
            { role: GuidanceMessageRole.USER, content: 'I want to feel more confident before a first date.' },
            { role: GuidanceMessageRole.ASSISTANT, content: 'Let’s keep it simple: choose a relaxed place where conversation can flow, and focus on being curious rather than impressive.' },
            { role: GuidanceMessageRole.USER, content: 'What is one good question I can ask?' },
            { role: GuidanceMessageRole.ASSISTANT, content: 'Try: “What has been making you happy lately?” It feels natural and gives you both room to share something real.' },
          ],
        },
      },
    });
  }

  const goal = await prisma.growthGoal.findFirst({
    where: { userId: user.id, source: 'PRESENTATION_DEMO' },
  });
  if (goal) {
    await prisma.growthGoal.update({
      where: { id: goal.id },
      data: { title: 'Communicate with more confidence', completedSteps: 3, targetSteps: 7, status: GrowthGoalStatus.ACTIVE },
    });
  } else {
    await prisma.growthGoal.create({
      data: {
        userId: user.id,
        title: 'Communicate with more confidence',
        description: 'Practice expressing needs clearly while staying curious and open.',
        completedSteps: 3,
        targetSteps: 7,
        status: GrowthGoalStatus.ACTIVE,
        source: 'PRESENTATION_DEMO',
      },
    });
  }

  await prisma.growthPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, timezone: 'Asia/Seoul', remindersEnabled: true, reminderHour: 19, gentleStreaks: true, analyticsConsent: true },
    update: { timezone: 'Asia/Seoul', remindersEnabled: true, gentleStreaks: true },
  });

  const matchmakingStartedAt = new Date();
  await prisma.matchmakingState.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      status: 'SEARCHING',
      consentedAt: matchmakingStartedAt,
      enabledAt: matchmakingStartedAt,
      readinessAnnouncedAt: matchmakingStartedAt,
    },
    update: {
      status: 'SEARCHING',
      consentedAt: matchmakingStartedAt,
      enabledAt: matchmakingStartedAt,
      readinessAnnouncedAt: matchmakingStartedAt,
      lastPresentedAt: null,
      lastNotifiedMatchId: null,
    },
  });

  await prisma.match.updateMany({
    where: { userId: user.id, matchedUserId: matchUser.id },
    data: {
      status: 'PROPOSED',
      respondedAt: null,
      response: null,
      introducedAt: null,
      expiresAt: null,
      viewedAt: null,
    },
  });

  console.log(`Presentation account prepared: ${email}`);
  console.log(`Presentation match prepared: ${matchEmail}`);
  console.log('Passwords unchanged. Open Your match as John to trigger the recommendation search.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
