import {
  CoachGender,
  CoachPersonality,
  Gender,
  InterestGender,
  PrismaClient,
  SexualOrientation,
  SoulprintCategory,
} from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();
const people = [
  { email: 'julia.demo@soulmeet.local', firstName: 'Julia', gender: Gender.FEMALE, city: 'Montreal', birthDate: '1999-04-12', traits: [['CORE_VALUE','honesty','Values honesty and emotional transparency'],['INTEREST','football','Enjoys football and live matches'],['INTEREST','technology','Follows new technology'],['RELATIONSHIP_GOAL','long-term','Wants a healthy long-term relationship'],['COMMUNICATION_STYLE','calm direct','Communicates calmly and directly']] },
  { email: 'amina.demo@soulmeet.local', firstName: 'Amina', gender: Gender.FEMALE, city: 'Montreal', birthDate: '1997-09-23', traits: [['CORE_VALUE','kindness','Values kindness and loyalty'],['INTEREST','video games','Enjoys cooperative video games'],['INTEREST','technology','Loves learning about new technology'],['RELATIONSHIP_GOAL','committed','Seeks a committed relationship'],['LOVE_LANGUAGE','quality time','Feels loved through quality time']] },
  { email: 'chloe.demo@soulmeet.local', firstName: 'Chloe', gender: Gender.FEMALE, city: 'Quebec', birthDate: '2000-01-17', traits: [['CORE_VALUE','honesty','Values honesty'],['INTEREST','coffee','Enjoys coffee shops'],['INTEREST','football','Likes watching football'],['RELATIONSHIP_GOAL','long-term','Wants to build something long-term'],['EMOTIONAL_NEED','reassurance','Appreciates reassurance and consistency']] },
  { email: 'maya.demo@soulmeet.local', firstName: 'Maya', gender: Gender.FEMALE, city: 'Toronto', birthDate: '1998-06-08', traits: [['CORE_VALUE','growth','Values personal growth'],['INTEREST','video games','Plays story-driven video games'],['INTEREST','travel','Enjoys spontaneous travel'],['COMMUNICATION_STYLE','direct','Prefers honest direct communication'],['LIFESTYLE','active','Keeps an active lifestyle']] },
  { email: 'sophie.demo@soulmeet.local', firstName: 'Sophie', gender: Gender.FEMALE, city: 'Montreal', birthDate: '1996-11-30', traits: [['CORE_VALUE','family','Values family and stability'],['INTEREST','technology','Works with emerging technology'],['INTEREST','coffee','Enjoys discovering coffee places'],['RELATIONSHIP_GOAL','committed','Looking for commitment'],['LOVE_LANGUAGE','quality time','Values quality time together']] },
  { email: 'lea.demo@soulmeet.local', firstName: 'Lea', gender: Gender.FEMALE, city: 'Laval', birthDate: '2001-02-14', traits: [['CORE_VALUE','loyalty','Values loyalty'],['INTEREST','football','Plays football on weekends'],['INTEREST','video games','Enjoys casual video games'],['COMMUNICATION_STYLE','calm','Prefers calm conversations'],['RELATIONSHIP_GOAL','serious','Open to a serious relationship']] },
  { email: 'noah.demo@soulmeet.local', firstName: 'Noah', gender: Gender.MALE, city: 'Montreal', birthDate: '1998-08-19', traits: [['CORE_VALUE','honesty','Values honesty'],['INTEREST','technology','Builds technology projects'],['INTEREST','football','Enjoys football'],['RELATIONSHIP_GOAL','long-term','Wants a long-term relationship'],['COMMUNICATION_STYLE','direct','Communicates directly']] },
  { email: 'liam.demo@soulmeet.local', firstName: 'Liam', gender: Gender.MALE, city: 'Toronto', birthDate: '1997-03-05', traits: [['CORE_VALUE','kindness','Values kindness'],['INTEREST','video games','Enjoys multiplayer video games'],['INTEREST','music','Loves live music'],['RELATIONSHIP_GOAL','committed','Seeks commitment'],['EMOTIONAL_NEED','consistency','Values emotional consistency']] },
] as const;

async function main() {
  const password = process.env.SOUL_DEMO_PASSWORD ?? 'SoulmeetDemo2026!';
  const passwordHash = await argon2.hash(password);
  const occupations = [
    'Product designer',
    'Data analyst',
    'Architect',
    'Travel photographer',
    'Software engineer',
    'Physiotherapist',
    'Product manager',
    'Music producer',
  ];
  for (const person of people) {
    const index = people.indexOf(person);
    const interestedInGender = person.gender === Gender.MALE
      ? InterestGender.FEMALE
      : InterestGender.MALE;
    const occupation = occupations[index]!;
    const user = await prisma.user.upsert({
      where: { email: person.email },
      create: { email: person.email, passwordHash, emailVerified: true },
      update: { passwordHash, emailVerified: true, isActive: true, accountStatus: 'ACTIVE' },
    });
    await prisma.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        firstName: person.firstName,
        birthDate: new Date(person.birthDate),
        gender: person.gender,
        sexualOrientation: SexualOrientation.HETEROSEXUAL,
        interestedInGender,
        country: 'Canada',
        city: person.city,
        occupation,
        onboardingCompleted: true,
      },
      update: {
        firstName: person.firstName,
        birthDate: new Date(person.birthDate),
        gender: person.gender,
        sexualOrientation: SexualOrientation.HETEROSEXUAL,
        interestedInGender,
        country: 'Canada',
        city: person.city,
        occupation,
        onboardingCompleted: true,
      },
    });
    await prisma.coach.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        name: person.gender === Gender.MALE ? 'Nova' : 'Lumina',
        gender: CoachGender.FEMALE,
        personality: CoachPersonality.FRIENDLY,
        traits: [CoachPersonality.FRIENDLY, CoachPersonality.EMPATHETIC, CoachPersonality.DATING_EXPERT],
        speakingStyle: 'Warm, clear, and encouraging',
        adviceStyle: 'Practical and reflective',
        empathyLevel: 82,
        directnessLevel: 62,
        humorLevel: 55,
        energyLevel: 68,
      },
      update: {
        name: person.gender === Gender.MALE ? 'Nova' : 'Lumina',
        gender: CoachGender.FEMALE,
        personality: CoachPersonality.FRIENDLY,
        traits: [CoachPersonality.FRIENDLY, CoachPersonality.EMPATHETIC, CoachPersonality.DATING_EXPERT],
        speakingStyle: 'Warm, clear, and encouraging',
        adviceStyle: 'Practical and reflective',
      },
    });
    const soulprint = await prisma.soulprint.upsert({ where: { userId: user.id }, create: { userId: user.id, completenessScore: 72 }, update: { completenessScore: 72 } });
    for (const [category, normalizedValue, value] of person.traits) {
      const fingerprint = `demo:${category}:${normalizedValue}`;
      await prisma.soulprintEntry.upsert({ where: { soulprintId_fingerprint: { soulprintId: soulprint.id, fingerprint } }, create: { soulprintId: soulprint.id, category: category as SoulprintCategory, key: normalizedValue, value, normalizedValue, fingerprint, source: 'USER_CONFIRMED', status: 'CONFIRMED', visibility: 'MATCHING_ALLOWED', sensitivity: 'NORMAL', confidence: 1, importance: 75, matchingWeight: 85, confirmedAt: new Date() }, update: { value, normalizedValue, status: 'CONFIRMED', visibility: 'MATCHING_ALLOWED', matchingWeight: 85 } });
    }
  }
  console.log(`Seeded ${people.length} complete Soul demo accounts.`);
  console.log(`Password for every demo account: ${password}`);
  console.log(people.map((person) => person.email).join('\n'));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
