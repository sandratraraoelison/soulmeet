CREATE TYPE "MatchmakingStatus" AS ENUM ('LEARNING', 'READY', 'SEARCHING', 'NO_MATCH_YET', 'MATCH_READY');
CREATE TYPE "MatchPairStatus" AS ENUM ('PROPOSED', 'RESERVED', 'INTRODUCED', 'MATCHED', 'CONNECTING', 'DATE_PLANNED', 'MET', 'CONTINUING', 'ENDED', 'DECLINED', 'EXPIRED', 'FADED');

ALTER TABLE "Match"
ADD COLUMN "scoreMin" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "scoreMax" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "reciprocalScoreMin" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "status" "MatchPairStatus" NOT NULL DEFAULT 'PROPOSED',
ADD COLUMN "introducedAt" TIMESTAMP(3),
ADD COLUMN "expiresAt" TIMESTAMP(3);

CREATE TABLE "MatchmakingState" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "MatchmakingStatus" NOT NULL DEFAULT 'LEARNING',
    "enabledAt" TIMESTAMP(3),
    "consentedAt" TIMESTAMP(3),
    "readinessAnnouncedAt" TIMESTAMP(3),
    "lastSearchedAt" TIMESTAMP(3),
    "lastPresentedAt" TIMESTAMP(3),
    "lastNotifiedMatchId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchmakingState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MatchmakingState_userId_key" ON "MatchmakingState"("userId");
CREATE INDEX "MatchmakingState_status_lastSearchedAt_idx" ON "MatchmakingState"("status", "lastSearchedAt");
CREATE INDEX "Match_userId_status_scoreMin_idx" ON "Match"("userId", "status", "scoreMin");
ALTER TABLE "MatchmakingState" ADD CONSTRAINT "MatchmakingState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
