CREATE TYPE "GuidanceConversationStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
ALTER TABLE "GuidanceConversation" ADD COLUMN "status" "GuidanceConversationStatus" NOT NULL DEFAULT 'ACTIVE';
CREATE INDEX "GuidanceConversation_userId_status_lastMessageAt_idx" ON "GuidanceConversation"("userId", "status", "lastMessageAt");
