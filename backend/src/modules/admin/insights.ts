import { Prisma } from '@prisma/client';

export function period(days: number, now = new Date()) {
  const end = new Date(now);
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - days + 1);
  // Compare equal elapsed windows, including the partial current UTC day.
  const previousStart = new Date(start.getTime() - days * 86400000);
  const previousEnd = new Date(end.getTime() - days * 86400000);
  return { start, end, previousStart, previousEnd };
}

// Aggregate metadata only; no message content leaves the database.
export function engagementSql(start: Date, end: Date, country?: string) {
  return Prisma.sql`
    WITH cohort AS (
      SELECT u.id, u."createdAt", p."onboardingCompleted" AS completed,
        EXISTS(SELECT 1 FROM "Soulprint" s WHERE s."userId" = u.id AND s."deletedAt" IS NULL AND s."createdAt" <= ${end}) AS soulprint,
        EXISTS(SELECT 1 FROM "Message" m WHERE m."senderId" = u.id AND m."isDeleted" = false AND m."createdAt" <= ${end}) AS messaged
      FROM "User" u LEFT JOIN "Profile" p ON p."userId" = u.id
      WHERE u.role = 'USER' AND u."createdAt" >= ${start} AND u."createdAt" <= ${end}
      ${country ? Prisma.sql`AND p.country = ${country}` : Prisma.empty}
    ), activity AS (
      SELECT m."senderId" AS id, m."createdAt" FROM "Message" m JOIN cohort c ON c.id = m."senderId" WHERE m."isDeleted" = false
      UNION ALL
      SELECT g."userId" AS id, m."createdAt" FROM "GuidanceMessage" m JOIN "GuidanceConversation" g ON g.id = m."conversationId"
      JOIN cohort c ON c.id = g."userId" WHERE m.role = 'USER' AND m."isDeleted" = false
    )
    SELECT count(*)::int AS registered,
      count(*) FILTER (WHERE completed)::int AS completed,
      count(*) FILTER (WHERE completed AND soulprint)::int AS soulprints,
      count(*) FILTER (WHERE completed AND soulprint AND messaged)::int AS conversations,
      count(*) FILTER (WHERE c."createdAt" + interval '8 days' <= ${end})::int AS "eligible7",
      count(*) FILTER (WHERE c."createdAt" + interval '8 days' <= ${end} AND EXISTS (
        SELECT 1 FROM activity a WHERE a.id = c.id AND a."createdAt" >= c."createdAt" + interval '7 days' AND a."createdAt" < c."createdAt" + interval '8 days'))::int AS "retained7",
      count(*) FILTER (WHERE c."createdAt" + interval '31 days' <= ${end})::int AS "eligible30",
      count(*) FILTER (WHERE c."createdAt" + interval '31 days' <= ${end} AND EXISTS (
        SELECT 1 FROM activity a WHERE a.id = c.id AND a."createdAt" >= c."createdAt" + interval '30 days' AND a."createdAt" < c."createdAt" + interval '31 days'))::int AS "retained30"
    FROM cohort c`;
}

export type Engagement = {
  registered: number;
  completed: number;
  soulprints: number;
  conversations: number;
  eligible7: number;
  retained7: number;
  eligible30: number;
  retained30: number;
};
