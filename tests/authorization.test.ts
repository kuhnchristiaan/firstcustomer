import { beforeEach, describe, it, expect, vi } from "vitest";
const f = vi.hoisted(() => ({
  session: vi.fn(),
  product: vi.fn(),
  transaction: vi.fn(),
  run: vi.fn(),
  latest: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  audit: vi.fn(),
}));
vi.mock("@/modules/auth/server", () => ({
  auth: () => ({ getSession: f.session }),
}));
vi.mock("@/lib/db", () => ({
  db: () => ({
    product: { findFirst: f.product },
    $transaction: f.transaction,
  }),
}));
import { tenant, ownedProduct } from "@/modules/auth/tenant";
import { approve } from "@/modules/analysis/service";
import { mockReport } from "@/modules/analysis/mock";
beforeEach(() => {
  vi.resetAllMocks();
  f.transaction.mockImplementation(async (cb) =>
    cb({
      $queryRaw: vi.fn(),
      analysisRun: { findFirst: f.run },
      productProfile: { findFirst: f.latest, create: f.create },
      product: { update: f.update },
      auditEvent: { create: f.audit },
    }),
  );
});
describe("authorization", () => {
  it("rejects missing sessions before touching tenant data", async () => {
    f.session.mockResolvedValue({ data: null });
    await expect(tenant()).rejects.toMatchObject({ status: 401 });
    expect(f.transaction).not.toHaveBeenCalled();
  });
  it("scopes reads to the authenticated organization", async () => {
    f.product.mockResolvedValue(null);
    await expect(
      ownedProduct("org-a", "product-in-org-b"),
    ).rejects.toMatchObject({ status: 404 });
    expect(f.product).toHaveBeenCalledWith({
      where: { id: "product-in-org-b", organizationId: "org-a" },
    });
  });
  it("cannot approve another tenant product", async () => {
    f.product.mockResolvedValue(null);
    await expect(
      approve(
        { organizationId: "org-a", userId: "u" },
        "foreign",
        "run",
        mockReport,
        0,
      ),
    ).rejects.toMatchObject({ status: 404 });
    expect(f.transaction).not.toHaveBeenCalled();
  });
  it("rejects incomplete or failed analyses", async () => {
    f.product.mockResolvedValue({ id: "p" });
    f.run.mockResolvedValue(null);
    await expect(
      approve(
        { organizationId: "org", userId: "u" },
        "p",
        "failed",
        mockReport,
        0,
      ),
    ).rejects.toMatchObject({ status: 404 });
    expect(f.create).not.toHaveBeenCalled();
  });
  it("detects stale profile updates", async () => {
    f.product.mockResolvedValue({ id: "p" });
    f.run.mockResolvedValue({ sources: [] });
    f.latest.mockResolvedValue({ version: 2 });
    await expect(
      approve({ organizationId: "org", userId: "u" }, "p", "r", mockReport, 1),
    ).rejects.toMatchObject({ status: 409 });
    expect(f.create).not.toHaveBeenCalled();
  });
  it("saves a new approved version and retains structured findings", async () => {
    f.product.mockResolvedValue({ id: "p" });
    f.run.mockResolvedValue({ sources: [] });
    f.latest.mockResolvedValue({ version: 1 });
    f.create.mockResolvedValue({ id: "new-profile", version: 2 });
    await expect(
      approve({ organizationId: "org", userId: "u" }, "p", "r", mockReport, 1),
    ).resolves.toMatchObject({ version: 2 });
    expect(f.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        version: 2,
        approvedBy: "u",
        findings: mockReport,
        segments: { create: expect.any(Array) },
      }),
    });
    expect(f.audit).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org",
        action: "PROFILE_APPROVED",
      }),
    });
  });
});
