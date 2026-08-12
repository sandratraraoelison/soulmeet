ALTER TABLE "SoulprintExtractionJob"
ADD COLUMN "requestedRevision" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "processingRevision" INTEGER NOT NULL DEFAULT 0;
