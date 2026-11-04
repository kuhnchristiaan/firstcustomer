-- Additive: original analyses, facts and approved profiles are untouched.
CREATE TABLE "StrategyRevision" (
 "id" TEXT NOT NULL, "analysisId" TEXT NOT NULL, "version" INTEGER NOT NULL,
 "founderContext" JSONB NOT NULL, "contextHash" TEXT NOT NULL, "output" JSONB,
 "status" TEXT NOT NULL DEFAULT 'RUNNING', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "leaseExpiresAt" TIMESTAMP(3) NOT NULL, "provider" TEXT NOT NULL, "model" TEXT NOT NULL,
 "inputTokens" INTEGER NOT NULL DEFAULT 0, "outputTokens" INTEGER NOT NULL DEFAULT 0,
 "estimatedCost" DECIMAL(12,6), "error" TEXT,
 CONSTRAINT "StrategyRevision_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "StrategyRevision_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "StrategyRevision_analysisId_version_key" ON "StrategyRevision"("analysisId","version");
CREATE INDEX "StrategyRevision_analysisId_createdAt_idx" ON "StrategyRevision"("analysisId","createdAt");
CREATE INDEX "StrategyRevision_status_leaseExpiresAt_idx" ON "StrategyRevision"("status","leaseExpiresAt");
CREATE TABLE "StrategyApproval" (
 "id" TEXT NOT NULL, "revisionId" TEXT NOT NULL, "productId" TEXT NOT NULL, "actorId" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "StrategyApproval_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "StrategyApproval_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "StrategyRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "StrategyApproval_productId_createdAt_idx" ON "StrategyApproval"("productId","createdAt");
