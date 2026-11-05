import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { Prisma } from "@/generated/prisma/client";
import { advisorWorkspace, reserve, failOperation } from "./service";
import { advisorConfig } from "./config";
import { advisorSchema, contextSchema } from "./schema";
import {
  weeklyResultsSchema,
  weeklyReviewSchema,
  validateWeeklyProposal,
} from "./weekly-schema";
import { reviewAdvisor, type UsageEntry } from "./provider";
type Tenant = { organizationId: string; userId: string };
const json = (v: unknown) =>
  JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
const hash = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");

export async function weeklyHistory(t: Tenant, productId: string) {
  const w = await advisorWorkspace(t, productId);
  const [plans, reviews, operations] = await Promise.all([
    db().advisorStrategy.findMany({
      where: { workspaceId: w.id },
      orderBy: { version: "desc" },
      include: { tasks: { orderBy: { position: "asc" } } },
    }),
    db().advisorWeeklyReview.findMany({
      where: { workspaceId: w.id },
      orderBy: { createdAt: "desc" },
    }),
    db().advisorOperation.findMany({
      where: { workspaceId: w.id, kind: "review" },
      select: { requestKey: true, status: true, leaseExpiresAt: true },
    }),
  ]);
  return {
    currentPlanId: w.strategies[0]?.id ?? null,
    plans,
    reviews: reviews.map((review) => {
      const operation = operations.find((op) => op.requestKey === review.id);
      return review.status === "RUNNING" &&
        operation &&
        (operation.status === "FAILED" ||
          operation.leaseExpiresAt <= new Date())
        ? { ...review, status: "FAILED" }
        : review;
    }),
  };
}

export async function submitResults(
  t: Tenant,
  productId: string,
  input: unknown,
) {
  const parsed = weeklyResultsSchema.parse(input);
  const results = {
    ...parsed,
    completedTaskIds: [...new Set(parsed.completedTaskIds)].sort(),
  };
  const { submissionKey, ...facts } = results;
  const resultsHash = hash(facts);
  const w = await advisorWorkspace(t, productId);
  return db().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "AdvisorWorkspace" WHERE id=${w.id} FOR UPDATE`;
    const existing = await tx.advisorWeeklyReview.findFirst({
      where: {
        workspaceId: w.id,
        OR: [{ planId: results.planId }, { submissionKey }],
      },
    });
    if (existing) {
      if (
        existing.planId === results.planId &&
        existing.resultsHash === resultsHash
      )
        return existing;
      throw new AppError(
        "Results already exist for this plan. They cannot be overwritten.",
        409,
      );
    }
    const plan = await tx.advisorStrategy.findFirst({
      where: { workspaceId: w.id },
      orderBy: { version: "desc" },
      include: { tasks: true },
    });
    if (!plan || plan.id !== results.planId)
      throw new AppError(
        "This plan changed. Reload before recording results.",
        409,
      );
    if (
      results.completedTaskIds.some(
        (id) => !plan.tasks.some((task) => task.id === id),
      )
    )
      throw new AppError("Completed tasks must belong to this plan.", 400);
    // Founder confirms actual completed work; metrics are never derived from it.
    for (const task of plan.tasks) {
      const completed = results.completedTaskIds.includes(task.id);
      if (completed !== task.completed)
        await tx.advisorTask.update({
          where: { id: task.id },
          data: {
            completed,
            completedAt: completed ? new Date() : null,
            version: { increment: 1 },
          },
        });
    }
    return tx.advisorWeeklyReview.create({
      data: {
        workspaceId: w.id,
        planId: plan.id,
        submissionKey,
        results: json(results),
        resultsHash,
      },
    });
  });
}

export async function generateWeeklyReview(
  t: Tenant,
  productId: string,
  reviewId: string,
) {
  const w = await advisorWorkspace(t, productId);
  const review = await db().advisorWeeklyReview.findFirst({
    where: { id: reviewId, workspaceId: w.id },
    include: { plan: { include: { tasks: true } } },
  });
  if (!review) throw new AppError("Results not found.", 404);
  if (review.proposal) return review;
  if (review.planId !== w.strategies[0]?.id)
    throw new AppError("These results belong to an older plan.", 409);
  const reserved = await reserve(t, w.id, "review", review.id);
  if (reserved.cached)
    return db().advisorWeeklyReview.findUniqueOrThrow({
      where: { id: review.id },
    });
  const usage: UsageEntry[] = [];
  try {
    await db().advisorWeeklyReview.update({
      where: { id: review.id },
      data: { status: "RUNNING" },
    });
    const ids = (w.profile as { statements: { id: string }[] }).statements.map(
      (s) => s.id,
    ) as [string, ...string[]];
    const original = await db().advisorStrategy.findFirstOrThrow({
      where: { workspaceId: w.id },
      orderBy: { version: "asc" },
    });
    const previous = await db().advisorWeeklyReview.findMany({
      where: { workspaceId: w.id, id: { not: review.id } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { results: true, proposal: true, status: true },
    });
    const currentPlan = advisorSchema(ids).parse(review.plan.output);
    const context = contextSchema.parse(review.plan.founderContext);
    const proposal = await reviewAdvisor(
      {
        product: w.profile,
        founderContext: context,
        originalStrategy: original.output,
        currentPlan,
        currentTasks: review.plan.tasks,
        results: review.results,
        previousReviews: previous,
      },
      ids,
      usage,
    );
    validateWeeklyProposal(proposal, currentPlan, context);
    return await db().$transaction(async (tx) => {
      const updated = await tx.advisorOperation.updateMany({
        where: {
          id: reserved.operation.id,
          status: "RUNNING",
          leaseExpiresAt: { gt: new Date() },
        },
        data: {
          status: "SUCCEEDED",
          completedAt: new Date(),
          output: json(proposal),
          usage: json(usage),
          estimatedCost: usage.reduce((n, u) => n + u.estimatedCost, 0),
        },
      });
      if (!updated.count)
        throw new AppError(
          "The review processing deadline expired. Your results remain saved.",
          409,
        );
      return tx.advisorWeeklyReview.update({
        where: { id: review.id },
        data: {
          status: "PROPOSED",
          proposal: json(proposal),
          reviewedAt: new Date(),
          fixture: advisorConfig().fixture,
        },
      });
    });
  } catch (error) {
    await failOperation(reserved.operation.id, usage);
    await db().advisorWeeklyReview.updateMany({
      where: { id: review.id, status: "RUNNING" },
      data: { status: "FAILED" },
    });
    if (error instanceof AppError) throw error;
    throw new AppError(
      "The review could not be completed. Your results and current plan remain saved; no changes were applied.",
      502,
    );
  }
}

export async function acceptWeeklyPlan(
  t: Tenant,
  productId: string,
  input: {
    reviewId: string;
    expectedPlanId: string;
    confirmMaterialChange: boolean;
  },
) {
  const w = await advisorWorkspace(t, productId);
  return db().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "AdvisorWorkspace" WHERE id=${w.id} FOR UPDATE`;
    const review = await tx.advisorWeeklyReview.findFirst({
      where: { id: input.reviewId, workspaceId: w.id },
    });
    if (!review) throw new AppError("Review not found.", 404);
    if (review.status === "ACCEPTED" && review.nextPlanId)
      return { planId: review.nextPlanId, alreadyAccepted: true };
    const current = await tx.advisorStrategy.findFirstOrThrow({
      where: { workspaceId: w.id },
      orderBy: { version: "desc" },
    });
    if (current.id !== input.expectedPlanId || review.planId !== current.id)
      throw new AppError(
        "A newer plan is active. Reload before approving.",
        409,
      );
    if (review.status !== "PROPOSED" || !review.proposal)
      throw new AppError(
        "A completed proposal is required before approval.",
        409,
      );
    const ids = (w.profile as { statements: { id: string }[] }).statements.map(
      (s) => s.id,
    ) as [string, ...string[]];
    const proposal = weeklyReviewSchema(ids).parse(review.proposal);
    const { materialChange } = validateWeeklyProposal(
      proposal,
      advisorSchema(ids).parse(current.output),
      contextSchema.parse(current.founderContext),
    );
    if (materialChange && !input.confirmMaterialChange)
      throw new AppError(
        "Explicitly confirm the proposed buyer or channel change before applying it.",
        400,
      );
    const plan = await tx.advisorStrategy.create({
      data: {
        workspaceId: w.id,
        version: current.version + 1,
        strategyVersion: current.strategyVersion + (materialChange ? 1 : 0),
        founderContext: json(current.founderContext),
        output: json(proposal.proposedPlan),
        fixture: review.fixture,
        tasks: {
          create: proposal.proposedPlan.tasks.map((_, position) => ({
            position,
          })),
        },
      },
    });
    await tx.advisorWeeklyReview.update({
      where: { id: review.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        acceptedBy: t.userId,
        nextPlanId: plan.id,
      },
    });
    await tx.auditEvent.create({
      data: {
        organizationId: t.organizationId,
        actorId: t.userId,
        action: materialChange
          ? "ADVISOR_STRATEGY_CHANGE_ACCEPTED"
          : "ADVISOR_NEXT_PLAN_ACCEPTED",
        resourceId: review.id,
      },
    });
    return { planId: plan.id, alreadyAccepted: false };
  });
}
