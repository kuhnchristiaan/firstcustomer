import { it, expect, beforeAll, afterAll, vi } from "vitest";
const f = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock("@/modules/auth/server", () => ({
  auth: () => ({ getSession: f.session }),
}));
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { tenant } from "@/modules/auth/tenant";
const connection = process.env.TEST_DATABASE_URL;
beforeAll(() => {
  if (!connection) return;
  if (
    !connection.startsWith("postgresql://firstcustomers_test@127.0.0.1:55439/")
  )
    throw new Error("Only the dedicated local test cluster is allowed");
  for (const [key, value] of Object.entries({
    DATABASE_URL: connection,
    APP_URL: "http://localhost:3000",
    NEON_AUTH_BASE_URL: "https://auth.example.com/auth",
    NEON_AUTH_COOKIE_SECRET: "test-only-cookie-secret-more-than-32-chars",
  }))
    vi.stubEnv(key, value);
});
afterAll(async () => {
  if (connection) await db().$disconnect();
  vi.unstubAllEnvs();
});
it.skipIf(!connection)(
  "creates exactly one organization and membership during simultaneous first requests",
  async () => {
    const id = randomUUID();
    f.session.mockResolvedValue({
      data: {
        user: {
          id,
          email: `${id}@example.com`,
          name: "Concurrent new founder",
        },
      },
    });
    const results = await Promise.all([tenant(), tenant(), tenant(), tenant()]);
    expect(new Set(results.map((r) => r.organizationId)).size).toBe(1);
    expect(await db().organization.count({ where: { ownerId: id } })).toBe(1);
    expect(await db().membership.count({ where: { userId: id } })).toBe(1);
  },
  30000,
);
it.skipIf(!connection)(
  "does not reactivate inactive memberships while restoring a workspace",
  async () => {
    const id = randomUUID();
    f.session.mockResolvedValue({
      data: {
        user: { id, email: `${id}@example.com`, name: "Inactive member" },
      },
    });
    const t = await tenant();
    await db().membership.updateMany({
      where: { userId: id, organizationId: t.organizationId },
      data: { status: "INACTIVE" },
    });
    await expect(tenant()).rejects.toMatchObject({ status: 403 });
  },
);
