CREATE TABLE "AuthIdentity" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerId" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AuthIdentity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthIdentity_provider_providerId_key" ON "AuthIdentity"("provider", "providerId");
CREATE INDEX "AuthIdentity_userId_idx" ON "AuthIdentity"("userId");
ALTER TABLE "AuthIdentity" ADD CONSTRAINT "AuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "AuthIdentity" ("id", "userId", "provider", "providerId", "email", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "id", "authProvider", "providerId", "email", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User"
WHERE "providerId" IS NOT NULL AND "authProvider" IN ('GOOGLE', 'APPLE')
ON CONFLICT ("provider", "providerId") DO NOTHING;
