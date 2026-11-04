-- AlterTable
ALTER TABLE "WebsiteSource" ALTER COLUMN "productId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "AnalysisRun" ADD COLUMN     "guestSessionId" TEXT,
ALTER COLUMN "productId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "GuestAnalysisSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "claimedOrganizationId" TEXT,
    "claimedByUserId" TEXT,
    "claimedProductId" TEXT,

    CONSTRAINT "GuestAnalysisSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageBucket_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "FunnelMetric" (
    "day" DATE NOT NULL,
    "event" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FunnelMetric_pkey" PRIMARY KEY ("day","event")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuestAnalysisSession_tokenHash_key" ON "GuestAnalysisSession"("tokenHash");

-- CreateIndex
CREATE INDEX "GuestAnalysisSession_expiresAt_claimedAt_idx" ON "GuestAnalysisSession"("expiresAt", "claimedAt");

-- CreateIndex
CREATE INDEX "UsageBucket_expiresAt_idx" ON "UsageBucket"("expiresAt");

-- CreateIndex
CREATE INDEX "AnalysisRun_guestSessionId_startedAt_idx" ON "AnalysisRun"("guestSessionId", "startedAt");

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_guestSessionId_fkey" FOREIGN KEY ("guestSessionId") REFERENCES "GuestAnalysisSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Every run must have a private guest session or an organization-owned product.
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_owner_required" CHECK ("productId" IS NOT NULL OR "guestSessionId" IS NOT NULL);
