ALTER TABLE "Coach"
ADD COLUMN "speakingStyle" TEXT,
ADD COLUMN "adviceStyle" TEXT,
ADD COLUMN "appearance" TEXT,
ADD COLUMN "humorLevel" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN "empathyLevel" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN "directnessLevel" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN "energyLevel" INTEGER NOT NULL DEFAULT 50;

CREATE TYPE "GuidanceMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

CREATE TABLE "GuidanceConversation" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "title" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "lastMessageAt" TIMESTAMP(3),
  CONSTRAINT "GuidanceConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GuidanceMessage" (
  "id" UUID NOT NULL,
  "conversationId" UUID NOT NULL,
  "role" "GuidanceMessageRole" NOT NULL,
  "content" TEXT,
  "provider" TEXT,
  "model" TEXT,
  "isEdited" BOOLEAN NOT NULL DEFAULT false,
  "editedAt" TIMESTAMP(3),
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GuidanceMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserMemory" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "content" TEXT NOT NULL,
  "category" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserMemory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Soulprint" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "summary" TEXT NOT NULL,
  "data" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Soulprint_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GuidanceConversation_userId_lastMessageAt_idx" ON "GuidanceConversation"("userId", "lastMessageAt");
CREATE INDEX "GuidanceMessage_conversationId_createdAt_idx" ON "GuidanceMessage"("conversationId", "createdAt");
CREATE INDEX "UserMemory_userId_updatedAt_idx" ON "UserMemory"("userId", "updatedAt");
CREATE UNIQUE INDEX "Soulprint_userId_key" ON "Soulprint"("userId");
ALTER TABLE "GuidanceConversation" ADD CONSTRAINT "GuidanceConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuidanceMessage" ADD CONSTRAINT "GuidanceMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "GuidanceConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserMemory" ADD CONSTRAINT "UserMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Soulprint" ADD CONSTRAINT "Soulprint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
