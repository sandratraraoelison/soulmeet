ALTER TABLE "SoulprintEntry"
ADD COLUMN "semanticData" JSONB,
ADD COLUMN "semanticModel" TEXT,
ADD COLUMN "semanticPromptVersion" TEXT,
ADD COLUMN "semanticSourceHash" TEXT,
ADD COLUMN "semanticAnalyzedAt" TIMESTAMP(3);

ALTER TABLE "Match"
ADD COLUMN "semanticScore" INTEGER,
ADD COLUMN "semanticConfidence" DOUBLE PRECISION,
ADD COLUMN "semanticModel" TEXT,
ADD COLUMN "semanticAnalysis" JSONB;
