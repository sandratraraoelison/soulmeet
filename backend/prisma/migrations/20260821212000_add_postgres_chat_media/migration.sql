CREATE TABLE "ChatMedia" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMedia_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChatMedia_ownerId_createdAt_idx" ON "ChatMedia"("ownerId", "createdAt");
ALTER TABLE "ChatMedia" ADD CONSTRAINT "ChatMedia_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
