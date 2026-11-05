-- AlterTable
ALTER TABLE "AdvisorStrategy" ADD COLUMN     "strategyVersion" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "AdvisorWeeklyReview" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "submissionKey" TEXT NOT NULL,
    "results" JSONB NOT NULL,
    "resultsHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "proposal" JSONB,
    "fixture" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "acceptedBy" TEXT,
    "nextPlanId" TEXT,

    CONSTRAINT "AdvisorWeeklyReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdvisorWeeklyReview_planId_key" ON "AdvisorWeeklyReview"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "AdvisorWeeklyReview_nextPlanId_key" ON "AdvisorWeeklyReview"("nextPlanId");

-- CreateIndex
CREATE INDEX "AdvisorWeeklyReview_workspaceId_createdAt_idx" ON "AdvisorWeeklyReview"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdvisorWeeklyReview_workspaceId_submissionKey_key" ON "AdvisorWeeklyReview"("workspaceId", "submissionKey");

-- AddForeignKey
ALTER TABLE "AdvisorWeeklyReview" ADD CONSTRAINT "AdvisorWeeklyReview_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "AdvisorWorkspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvisorWeeklyReview" ADD CONSTRAINT "AdvisorWeeklyReview_planId_fkey" FOREIGN KEY ("planId") REFERENCES "AdvisorStrategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AdvisorOperation" DROP CONSTRAINT "AdvisorOperation_state_check";
ALTER TABLE "AdvisorOperation" ADD CONSTRAINT "AdvisorOperation_state_check" CHECK ("reservedUsd" > 0 AND "status" IN ('RUNNING', 'SUCCEEDED', 'FAILED') AND "kind" IN ('strategy', 'explain', 'task', 'review'));
ALTER TABLE "AdvisorStrategy" ADD CONSTRAINT "AdvisorStrategy_strategyVersion_check" CHECK ("strategyVersion" >= 1);
ALTER TABLE "AdvisorWeeklyReview" ADD CONSTRAINT "AdvisorWeeklyReview_state_check" CHECK ("status" IN ('SUBMITTED', 'RUNNING', 'PROPOSED', 'ACCEPTED', 'FAILED') AND ("status" <> 'ACCEPTED' OR ("acceptedAt" IS NOT NULL AND "acceptedBy" IS NOT NULL AND "nextPlanId" IS NOT NULL)));
