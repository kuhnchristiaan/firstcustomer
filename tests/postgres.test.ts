import { describe, it, expect, afterAll, vi } from "vitest";
// Only the framework-bound auth adapter is mocked; SQL and domain services are real.
vi.mock("@/modules/auth/server", () => ({
  auth: () => {
    throw new Error("Auth adapter is not part of database integration tests");
  },
}));
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { generate, approve } from "@/modules/analysis/service";
import { ownedProduct } from "@/modules/auth/tenant";
import { mockReport } from "@/modules/analysis/mock";
import * as providerModule from "@/modules/analysis/provider";
import * as websiteModule from "@/modules/website/extract";
const connection = process.env.TEST_DATABASE_URL;
describe.skipIf(!connection)("isolated PostgreSQL integration", () => {
  it("reserves runs atomically, isolates tenants and persists approved versions", async () => {
    if (
      !connection?.startsWith(
        "postgresql://firstcustomers_test@127.0.0.1:55439/",
      )
    )
      throw new Error("Use only the dedicated local test cluster");
    process.env.DATABASE_URL = connection;
    process.env.APP_URL = "http://localhost:3000";
    process.env.NEON_AUTH_BASE_URL = "https://auth.example.com/auth";
    process.env.NEON_AUTH_COOKIE_SECRET =
      "test-only-secret-not-for-production-123456";
    process.env.MOCK_ANALYSIS = "true";
    process.env.MONTHLY_ANALYSIS_QUOTA = "2";
    const p = db();
    const suffix = randomUUID();
    const user = await p.user.create({
      data: { id: `test-${suffix}`, email: "test@example.com" },
    });
    const other = await p.user.create({
      data: { id: `other-${suffix}`, email: "other@example.com" },
    });
    const org = await p.organization.create({
      data: {
        name: "Isolated test",
        slug: `test-${suffix}`,
        ownerId: user.id,
        memberships: { create: { userId: user.id } },
      },
    });
    const otherOrg = await p.organization.create({
      data: {
        name: "Other isolated tenant",
        slug: `other-${suffix}`,
        ownerId: other.id,
      },
    });
    const t = { organizationId: org.id, userId: user.id };
    const attempts = await Promise.allSettled([
      generate(t, "https://example.com"),
      generate(t, "https://example.com"),
    ]);
    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(1);
    const success = attempts.find((a) => a.status === "fulfilled");
    if (success?.status !== "fulfilled")
      throw new Error("Missing generated report");
    const productId = success.value;
    await expect(ownedProduct(otherOrg.id, productId)).rejects.toMatchObject({
      status: 404,
    });
    const run = await p.analysisRun.findFirstOrThrow({
      where: { productId, status: "SUCCEEDED" },
    });
    expect(run.output).toEqual(mockReport);
    expect(run.estimatedCost?.toString()).toBe("0");
    const profile = await approve(t, productId, run.id, mockReport, 0);
    expect(profile.version).toBe(1);
    const edited = {
      ...mockReport,
      positioning: {
        ...mockReport.positioning,
        text: "A founder-reviewed positioning hypothesis.",
      },
    };
    await approve(t, productId, run.id, edited, 1);
    const profiles = await p.productProfile.findMany({
      where: { productId },
      orderBy: { version: "asc" },
      include: { segments: true },
    });
    expect(profiles).toHaveLength(2);
    expect(profiles[0].findings).toEqual(mockReport);
    expect(profiles[1].findings).toEqual(edited);
    expect(profiles[1].segments).toHaveLength(3);
    await expect(
      approve(t, productId, run.id, mockReport, 0),
    ).rejects.toMatchObject({ status: 409 });
    await generate(t, "https://second.example.com");
    await expect(
      generate(t, "https://third.example.com"),
    ).rejects.toMatchObject({ status: 429 });
    expect(
      await p.analysisRun.count({
        where: { product: { organizationId: org.id } },
      }),
    ).toBe(2);
    const failingProvider = vi
      .spyOn(providerModule, "provider")
      .mockReturnValue({
        analyze: async () => {
          throw new Error("Simulated malformed provider response");
        },
      });
    try {
      await expect(
        generate(
          { organizationId: otherOrg.id, userId: other.id },
          "https://failure.example.com",
        ),
      ).rejects.toMatchObject({ status: 502 });
      const failed = await p.analysisRun.findFirstOrThrow({
        where: { product: { organizationId: otherOrg.id } },
      });
      expect(failed.status).toBe("FAILED");
      expect(failed.output).toBeNull();
      expect(failed.completedAt).not.toBeNull();
    } finally {
      failingProvider.mockRestore();
    }
    // Real crawls also carry link-discovery metadata. Only source columns belong in Prisma.
    const crawledPage = {
      url: "https://source.example.com/",
      title: "Source",
      content: "Useful SaaS website content for the persistence regression.",
      contentHash: "test-hash",
      status: "SUCCESS",
      links: ["/pricing"],
    };
    const crawlStub = vi
      .spyOn(websiteModule, "crawl")
      .mockResolvedValue([crawledPage]);
    const providerStub = vi.spyOn(providerModule, "provider").mockReturnValue({
      analyze: async () => ({
        report: mockReport,
        inputTokens: 100,
        outputTokens: 50,
      }),
    });
    process.env.MOCK_ANALYSIS = "false";
    try {
      const sourcedProduct = await generate(
        { organizationId: otherOrg.id, userId: other.id },
        "https://source.example.com/",
      );
      const sourceCount = await p.websiteSource.count({
        where: { productId: sourcedProduct },
      });
      expect(sourceCount).toBe(1);
      const sourcedRun = await p.analysisRun.findFirstOrThrow({
        where: { productId: sourcedProduct },
      });
      expect(sourcedRun.status).toBe("SUCCEEDED");
      expect(sourcedRun.inputTokens).toBe(100);
    } finally {
      crawlStub.mockRestore();
      providerStub.mockRestore();
      process.env.MOCK_ANALYSIS = "true";
    }
    const { siteFixture } = await import("./fixtures/product-attribution");
    const f = siteFixture();
    const attributed = {
      ...f.report,
      schemaVersion: "1.1" as const,
      productIntelligence: f.profile,
      recommendationBasis: f.basis,
    };
    const attributedProduct = await p.product.create({
      data: {
        organizationId: org.id,
        name: f.profile.identity.name,
        websiteUrl: f.source.url,
      },
    });
    const attributedRun = await p.analysisRun.create({
      data: {
        productId: attributedProduct.id,
        status: "SUCCEEDED",
        provider: "fixture",
        model: "fixture",
        output: attributed,
        leaseExpiresAt: new Date(Date.now() + 60000),
        sources: {
          create: {
            url: f.source.url,
            title: f.source.title,
            content: f.source.content,
            contentHash: f.source.contentHash,
            status: "SUCCESS",
            productId: attributedProduct.id,
          },
        },
      },
    });
    const approved = await approve(
      t,
      attributedProduct.id,
      attributedRun.id,
      attributed,
      0,
    );
    expect(approved.findings).toMatchObject({ productIntelligence: f.profile });
    await expect(
      approve(
        t,
        attributedProduct.id,
        attributedRun.id,
        { ...attributed, schemaVersion: "1.0" },
        1,
      ),
    ).rejects.toMatchObject({ status: 400 });
    const changed = structuredClone(attributed);
    changed.productIntelligence.identity.name = "Fictional demo";
    await expect(
      approve(t, attributedProduct.id, attributedRun.id, changed, 1),
    ).rejects.toMatchObject({ status: 400 });
    const editedAttribution = {
      ...attributed,
      positioning: {
        ...attributed.positioning,
        text: "Founder reviewed acquisition positioning",
      },
    };
    await approve(
      t,
      attributedProduct.id,
      attributedRun.id,
      editedAttribution,
      1,
    );
    expect(
      await p.productProfile.count({
        where: { productId: attributedProduct.id },
      }),
    ).toBe(2);
    expect(
      (
        await p.analysisRun.findUniqueOrThrow({
          where: { id: attributedRun.id },
        })
      ).output,
    ).toEqual(attributed);
    // The same safe, actionable budget failure must reach the form and persisted run,
    // retaining billed usage and leaving prior successful reports unchanged.
    const { executeAnalysis } = await import("@/modules/analysis/execute");
    const failedBudgetRun = await p.analysisRun.create({
      data: {
        productId: attributedProduct.id,
        leaseExpiresAt: new Date(Date.now() + 60000),
        provider: "fixture",
        model: "fixture",
      },
    });
    const budgetFailure = vi.spyOn(providerModule, "provider").mockReturnValue({
      analyze: async () => {
        throw new providerModule.ProviderOutputError(120, 40, "input_budget");
      },
    });
    try {
      await expect(
        executeAnalysis(
          failedBudgetRun.id,
          attributedProduct.id,
          f.source.url,
          undefined,
          t,
        ),
      ).rejects.toMatchObject({
        status: 422,
        message: expect.stringContaining("main product page"),
      });
      const failed = await p.analysisRun.findUniqueOrThrow({
        where: { id: failedBudgetRun.id },
      });
      expect(failed).toMatchObject({
        status: "FAILED",
        inputTokens: 120,
        outputTokens: 40,
        error: expect.stringContaining("main product page"),
      });
      expect(
        (
          await p.analysisRun.findUniqueOrThrow({
            where: { id: attributedRun.id },
          })
        ).output,
      ).toEqual(attributed);
    } finally {
      budgetFailure.mockRestore();
    }
    const priorQuota = process.env.MONTHLY_ANALYSIS_QUOTA;
    process.env.MONTHLY_ANALYSIS_QUOTA = "100";
    try {
      const recoveryOwner = await p.user.create({
        data: {
          id: `recovery-${suffix}`,
          email: `${suffix}@recovery.example.invalid`,
        },
      });
      const recoveryOrg = await p.organization.create({
        data: {
          name: "Lease recovery",
          slug: `recovery-${suffix}`,
          ownerId: recoveryOwner.id,
          memberships: { create: { userId: recoveryOwner.id } },
        },
      });
      const recoveryTenant = {
        organizationId: recoveryOrg.id,
        userId: recoveryOwner.id,
      };
      const recoveryProduct = await p.product.create({
        data: {
          organizationId: recoveryOrg.id,
          name: "Lease test",
          websiteUrl: "https://lease.example.invalid/",
        },
      });
      const expired = await p.analysisRun.create({
        data: {
          productId: recoveryProduct.id,
          leaseExpiresAt: new Date(Date.now() - 1000),
          provider: "fixture",
          model: "fixture",
        },
      });
      await generate(recoveryTenant, `https://retry-${suffix}.example.com`);
      expect(
        (await p.analysisRun.findUniqueOrThrow({ where: { id: expired.id } }))
          .status,
      ).toBe("FAILED");
      const active = await p.analysisRun.create({
        data: {
          productId: recoveryProduct.id,
          leaseExpiresAt: new Date(Date.now() + 60000),
          provider: "fixture",
          model: "fixture",
        },
      });
      await expect(
        generate(recoveryTenant, `https://busy-${suffix}.example.com`),
      ).rejects.toMatchObject({ status: 429, code: "analysis_busy" });
      expect(
        (await p.analysisRun.findUniqueOrThrow({ where: { id: active.id } }))
          .status,
      ).toBe("RUNNING");
      await p.analysisRun.update({
        where: { id: active.id },
        data: { status: "FAILED" },
      });
    } finally {
      process.env.MONTHLY_ANALYSIS_QUOTA = priorQuota;
    }
  }, 30000);
  afterAll(async () => {
    if (connection) await db().$disconnect();
  });
});
