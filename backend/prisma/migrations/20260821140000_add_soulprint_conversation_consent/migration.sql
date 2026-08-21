ALTER TYPE "SoulprintSource" ADD VALUE IF NOT EXISTS 'PEER_CONVERSATION';
ALTER TYPE "SoulprintSource" ADD VALUE IF NOT EXISTS 'COACH_CONVERSATION';
ALTER TYPE "SoulprintSource" ADD VALUE IF NOT EXISTS 'USER_FEEDBACK';

CREATE TABLE "SoulprintConsent" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "conversationAnalysisAllowed" BOOLEAN NOT NULL,
  "consentVersion" TEXT NOT NULL,
  "consentedAt" TIMESTAMP(3),
  "withdrawnAt" TIMESTAMP(3),
  "analysisAllowedFrom" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SoulprintConsent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SoulprintConsentEvent" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "conversationAnalysisAllowed" BOOLEAN NOT NULL,
  "consentVersion" TEXT NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SoulprintConsentEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SoulprintConsent_userId_key" ON "SoulprintConsent"("userId");
CREATE INDEX "SoulprintConsent_conversationAnalysisAllowed_analysisAllowedFrom_idx" ON "SoulprintConsent"("conversationAnalysisAllowed", "analysisAllowedFrom");
CREATE INDEX "SoulprintConsentEvent_userId_changedAt_idx" ON "SoulprintConsentEvent"("userId", "changedAt");
ALTER TABLE "SoulprintConsent" ADD CONSTRAINT "SoulprintConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SoulprintConsentEvent" ADD CONSTRAINT "SoulprintConsentEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PeerConversationAnalysisJob" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "conversationId" UUID NOT NULL,
  "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lockedAt" TIMESTAMP(3),
  "lastProcessedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PeerConversationAnalysisJob_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PeerConversationAnalysisJob_userId_conversationId_key" ON "PeerConversationAnalysisJob"("userId", "conversationId");
CREATE INDEX "PeerConversationAnalysisJob_runAt_lockedAt_idx" ON "PeerConversationAnalysisJob"("runAt", "lockedAt");
ALTER TABLE "PeerConversationAnalysisJob" ADD CONSTRAINT "PeerConversationAnalysisJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
