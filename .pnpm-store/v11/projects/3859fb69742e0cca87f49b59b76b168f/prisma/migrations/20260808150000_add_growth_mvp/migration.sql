CREATE TYPE "GrowthGoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

CREATE TABLE "GrowthGoal" (
  "id" UUID NOT NULL, "userId" UUID NOT NULL, "title" TEXT NOT NULL,
  "description" TEXT, "targetSteps" INTEGER NOT NULL DEFAULT 5,
  "completedSteps" INTEGER NOT NULL DEFAULT 0,
  "status" "GrowthGoalStatus" NOT NULL DEFAULT 'ACTIVE', "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GrowthGoal_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "GrowthExercise" (
  "id" UUID NOT NULL, "userId" UUID NOT NULL, "dayKey" TEXT NOT NULL, "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL, "description" TEXT NOT NULL, "durationMin" INTEGER NOT NULL DEFAULT 5,
  "completedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "GrowthExercise_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "GrowthCheckIn" (
  "id" UUID NOT NULL, "userId" UUID NOT NULL, "weekKey" TEXT NOT NULL, "mood" INTEGER NOT NULL,
  "reflection" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "GrowthCheckIn_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GrowthGoal_userId_status_updatedAt_idx" ON "GrowthGoal"("userId", "status", "updatedAt");
CREATE UNIQUE INDEX "GrowthExercise_userId_dayKey_key" ON "GrowthExercise"("userId", "dayKey");
CREATE INDEX "GrowthExercise_userId_createdAt_idx" ON "GrowthExercise"("userId", "createdAt");
CREATE UNIQUE INDEX "GrowthCheckIn_userId_weekKey_key" ON "GrowthCheckIn"("userId", "weekKey");
CREATE INDEX "GrowthCheckIn_userId_updatedAt_idx" ON "GrowthCheckIn"("userId", "updatedAt");
ALTER TABLE "GrowthGoal" ADD CONSTRAINT "GrowthGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrowthExercise" ADD CONSTRAINT "GrowthExercise_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrowthCheckIn" ADD CONSTRAINT "GrowthCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
