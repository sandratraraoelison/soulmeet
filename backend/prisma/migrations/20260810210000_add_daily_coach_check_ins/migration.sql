CREATE TYPE "CoachDailyCheckInStatus" AS ENUM ('PENDING', 'RUNNING', 'SENT', 'FAILED');

CREATE TABLE "CoachDailyCheckIn" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "dayKey" TEXT NOT NULL,
  "status" "CoachDailyCheckInStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lockedAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "messageId" UUID,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CoachDailyCheckIn_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CoachDailyCheckIn_userId_dayKey_key" ON "CoachDailyCheckIn"("userId", "dayKey");
CREATE INDEX "CoachDailyCheckIn_status_createdAt_idx" ON "CoachDailyCheckIn"("status", "createdAt");

ALTER TABLE "CoachDailyCheckIn"
  ADD CONSTRAINT "CoachDailyCheckIn_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
