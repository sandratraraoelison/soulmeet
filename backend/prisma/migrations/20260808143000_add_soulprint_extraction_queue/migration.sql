CREATE TYPE "SoulprintExtractionJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

CREATE TABLE "SoulprintExtractionJob" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "conversationId" UUID,
  "status" "SoulprintExtractionJobStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SoulprintExtractionJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SoulprintExtractionMetric" (
  "id" UUID NOT NULL,
  "outcome" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "totalDurationMs" BIGINT NOT NULL DEFAULT 0,
  "lastOccurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SoulprintExtractionMetric_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SoulprintExtractionJob_userId_key" ON "SoulprintExtractionJob"("userId");
CREATE INDEX "SoulprintExtractionJob_status_runAt_idx" ON "SoulprintExtractionJob"("status", "runAt");
CREATE UNIQUE INDEX "SoulprintExtractionMetric_outcome_code_key" ON "SoulprintExtractionMetric"("outcome", "code");
ALTER TABLE "SoulprintExtractionJob" ADD CONSTRAINT "SoulprintExtractionJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
