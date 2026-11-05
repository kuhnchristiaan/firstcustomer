-- CreateTable
CREATE TABLE "AdvisorWorkspace" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "founderContext" JSONB NOT NULL,
    "profile" JSONB,
    "sources" JSONB,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdvisorWorkspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvisorStrategy" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "founderContext" JSONB NOT NULL,
    "output" JSONB NOT NULL,
    "fixture" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdvisorStrategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvisorTask" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AdvisorTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvisorOperation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "leaseExpiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "model" TEXT NOT NULL,
    "reservedUsd" DECIMAL(12,6) NOT NULL,
    "usage" JSONB,
    "estimatedCost" DECIMAL(12,6),
    "output" JSONB,
    "error" TEXT,

    CONSTRAINT "AdvisorOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdvisorWorkspace_productId_key" ON "AdvisorWorkspace"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "AdvisorStrategy_workspaceId_version_key" ON "AdvisorStrategy"("workspaceId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "AdvisorTask_strategyId_position_key" ON "AdvisorTask"("strategyId", "position");

-- CreateIndex
CREATE INDEX "AdvisorOperation_status_leaseExpiresAt_idx" ON "AdvisorOperation"("status", "leaseExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdvisorOperation_workspaceId_kind_requestKey_key" ON "AdvisorOperation"("workspaceId", "kind", "requestKey");

-- AddForeignKey
ALTER TABLE "AdvisorWorkspace" ADD CONSTRAINT "AdvisorWorkspace_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvisorStrategy" ADD CONSTRAINT "AdvisorStrategy_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "AdvisorWorkspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvisorTask" ADD CONSTRAINT "AdvisorTask_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "AdvisorStrategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvisorOperation" ADD CONSTRAINT "AdvisorOperation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "AdvisorWorkspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Advisor state invariants; historical tables and rows are untouched.
ALTER TABLE "AdvisorWorkspace" ADD CONSTRAINT "AdvisorWorkspace_version_check" CHECK ("version" >= 0);
ALTER TABLE "AdvisorStrategy" ADD CONSTRAINT "AdvisorStrategy_version_check" CHECK ("version" >= 1);
ALTER TABLE "AdvisorTask" ADD CONSTRAINT "AdvisorTask_state_check" CHECK ("position" >= 0 AND "version" >= 0 AND (("completed" AND "completedAt" IS NOT NULL) OR (NOT "completed" AND "completedAt" IS NULL)));
ALTER TABLE "AdvisorOperation" ADD CONSTRAINT "AdvisorOperation_state_check" CHECK ("reservedUsd" > 0 AND "status" IN ('RUNNING', 'SUCCEEDED', 'FAILED') AND "kind" IN ('strategy', 'explain', 'task'));
