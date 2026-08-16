-- 2FA for administrator accounts and persisted Soul match history.
ALTER TABLE "User" ADD COLUMN "twoFactorSecret" TEXT,
ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "twoFactorRecoveryCodes" JSONB;
CREATE TABLE "Match" ("id" UUID NOT NULL, "userId" UUID NOT NULL, "matchedUserId" UUID NOT NULL, "score" INTEGER NOT NULL, "reciprocalScore" INTEGER NOT NULL, "reasons" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "viewedAt" TIMESTAMP(3), "respondedAt" TIMESTAMP(3), "response" TEXT, CONSTRAINT "Match_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "Match_userId_matchedUserId_key" ON "Match"("userId", "matchedUserId");
CREATE INDEX "Match_userId_createdAt_idx" ON "Match"("userId", "createdAt");
CREATE INDEX "Match_matchedUserId_createdAt_idx" ON "Match"("matchedUserId", "createdAt");
ALTER TABLE "Match" ADD CONSTRAINT "Match_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_matchedUserId_fkey" FOREIGN KEY ("matchedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
