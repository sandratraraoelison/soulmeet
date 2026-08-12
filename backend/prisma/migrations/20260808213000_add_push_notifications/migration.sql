CREATE TABLE "PushDevice" (
  "id" UUID NOT NULL, "userId" UUID NOT NULL, "token" TEXT NOT NULL, "platform" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true, "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PushDevice_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "NotificationPreference" (
  "id" UUID NOT NULL, "userId" UUID NOT NULL, "newMessages" BOOLEAN NOT NULL DEFAULT true,
  "coachReflections" BOOLEAN NOT NULL DEFAULT true, "soulprintConfirmations" BOOLEAN NOT NULL DEFAULT true,
  "growthReminders" BOOLEAN NOT NULL DEFAULT false, "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
  "quietHoursStart" INTEGER NOT NULL DEFAULT 22, "quietHoursEnd" INTEGER NOT NULL DEFAULT 8,
  "timezone" TEXT NOT NULL DEFAULT 'UTC', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PushDevice_token_key" ON "PushDevice"("token");
CREATE INDEX "PushDevice_userId_active_idx" ON "PushDevice"("userId", "active");
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");
ALTER TABLE "PushDevice" ADD CONSTRAINT "PushDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
