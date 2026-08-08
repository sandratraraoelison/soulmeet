CREATE TYPE "SoulprintCategory" AS ENUM ('PERSONALITY','CORE_VALUE','INTEREST','RELATIONSHIP_GOAL','PARTNER_PREFERENCE','COMMUNICATION_STYLE','LOVE_LANGUAGE','EMOTIONAL_NEED','BOUNDARY','STRENGTH','CHALLENGE','DISLIKE','HABIT','LIFESTYLE','PAST_EXPERIENCE','RELATIONSHIP_PATTERN','DEAL_BREAKER','IMPORTANT_PERSON','IMPORTANT_EVENT','LOCATION_PREFERENCE','FUTURE_PLAN','OTHER');
CREATE TYPE "SoulprintSource" AS ENUM ('USER_PROFILE','USER_DECLARED','USER_CONFIRMED','AI_INFERRED','MANUAL_USER_ENTRY','SYSTEM_MIGRATION');
CREATE TYPE "SoulprintEntryStatus" AS ENUM ('PENDING_CONFIRMATION','ACTIVE','CONFIRMED','REJECTED','SUPERSEDED','DELETED');
CREATE TYPE "SoulprintVisibility" AS ENUM ('PRIVATE','GUIDANCE_ONLY','MATCHING_ALLOWED');
CREATE TYPE "SoulprintSensitivity" AS ENUM ('NORMAL','PERSONAL','SENSITIVE','HIGHLY_SENSITIVE');

ALTER TABLE "Soulprint" RENAME COLUMN "data" TO "legacyData";
ALTER TABLE "Soulprint" ALTER COLUMN "summary" DROP NOT NULL;
ALTER TABLE "Soulprint" ALTER COLUMN "summary" TYPE JSONB USING CASE WHEN "summary" IS NULL THEN NULL ELSE jsonb_build_object('overview', "summary") END;
ALTER TABLE "Soulprint"
  ADD COLUMN "summaryVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "completenessScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastExtractedAt" TIMESTAMP(3),
  ADD COLUMN "lastSummarizedAt" TIMESTAMP(3),
  ADD COLUMN "lastAnalyzedMessageId" UUID,
  ADD COLUMN "promptVersion" TEXT,
  ADD COLUMN "extractionRunningAt" TIMESTAMP(3),
  ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE TABLE "SoulprintEntry" (
  "id" UUID NOT NULL, "soulprintId" UUID NOT NULL, "category" "SoulprintCategory" NOT NULL,
  "key" TEXT, "value" TEXT NOT NULL, "normalizedValue" TEXT, "fingerprint" TEXT NOT NULL,
  "source" "SoulprintSource" NOT NULL, "status" "SoulprintEntryStatus" NOT NULL,
  "visibility" "SoulprintVisibility" NOT NULL DEFAULT 'PRIVATE', "sensitivity" "SoulprintSensitivity" NOT NULL DEFAULT 'NORMAL',
  "confidence" DOUBLE PRECISION NOT NULL, "importance" INTEGER NOT NULL DEFAULT 50, "matchingWeight" INTEGER NOT NULL DEFAULT 50,
  "firstObservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lastObservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMP(3), "rejectedAt" TIMESTAMP(3), "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SoulprintEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SoulprintEntry_confidence_check" CHECK ("confidence" >= 0 AND "confidence" <= 1),
  CONSTRAINT "SoulprintEntry_importance_check" CHECK ("importance" >= 0 AND "importance" <= 100),
  CONSTRAINT "SoulprintEntry_matchingWeight_check" CHECK ("matchingWeight" >= 0 AND "matchingWeight" <= 100)
);

CREATE TABLE "SoulprintEvidence" (
  "id" UUID NOT NULL, "entryId" UUID NOT NULL, "messageId" UUID, "conversationId" UUID,
  "sourceExcerptHash" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SoulprintEvidence_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SoulprintEntryChange" (
  "id" UUID NOT NULL, "entryId" UUID NOT NULL, "changeType" TEXT NOT NULL, "previousValue" JSONB,
  "newValue" JSONB, "changedBy" TEXT NOT NULL, "reason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SoulprintEntryChange_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SoulprintVersion" (
  "id" UUID NOT NULL, "soulprintId" UUID NOT NULL, "version" INTEGER NOT NULL, "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "SoulprintVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SoulprintEntry_soulprintId_fingerprint_key" ON "SoulprintEntry"("soulprintId", "fingerprint");
CREATE INDEX "SoulprintEntry_soulprintId_category_status_idx" ON "SoulprintEntry"("soulprintId", "category", "status");
CREATE INDEX "SoulprintEntry_soulprintId_visibility_idx" ON "SoulprintEntry"("soulprintId", "visibility");
CREATE UNIQUE INDEX "SoulprintEvidence_entryId_messageId_key" ON "SoulprintEvidence"("entryId", "messageId");
CREATE INDEX "SoulprintEvidence_entryId_idx" ON "SoulprintEvidence"("entryId");
CREATE INDEX "SoulprintEvidence_messageId_idx" ON "SoulprintEvidence"("messageId");
CREATE INDEX "SoulprintEntryChange_entryId_createdAt_idx" ON "SoulprintEntryChange"("entryId", "createdAt");
CREATE UNIQUE INDEX "SoulprintVersion_soulprintId_version_key" ON "SoulprintVersion"("soulprintId", "version");
ALTER TABLE "SoulprintEntry" ADD CONSTRAINT "SoulprintEntry_soulprintId_fkey" FOREIGN KEY ("soulprintId") REFERENCES "Soulprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SoulprintEvidence" ADD CONSTRAINT "SoulprintEvidence_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "SoulprintEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SoulprintEvidence" ADD CONSTRAINT "SoulprintEvidence_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "GuidanceMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SoulprintEvidence" ADD CONSTRAINT "SoulprintEvidence_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "GuidanceConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SoulprintEntryChange" ADD CONSTRAINT "SoulprintEntryChange_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "SoulprintEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SoulprintVersion" ADD CONSTRAINT "SoulprintVersion_soulprintId_fkey" FOREIGN KEY ("soulprintId") REFERENCES "Soulprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
