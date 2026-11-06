import { it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("@/modules/auth/tenant", () => ({
  AppError: class extends Error { status = 401; },
  tenant: async () => ({ organizationId: "test-org", userId: "test-user" }),
}));
vi.mock("@/lib/db", () => ({
  db: () => ({
    product: {
      findMany: async () => [
        {
          id: "saved-plan",
          name: "Saved product",
          websiteUrl: "https://one.example/",
          advisor: { strategies: [{ id: "strategy" }] },
        },
        {
          id: "old-product",
          name: "Old product",
          websiteUrl: "https://two.example/",
          advisor: null,
        },
      ],
    },
  }),
}));
vi.mock("@/components/auth-form", () => ({ SignOut: () => null }));
vi.mock("@/components/advisor-start", () => ({ AdvisorStart: () => null }));
import Dashboard from "@/app/dashboard/page";
it("routes saved plans to the advisor and products without plans to prefilled advisor setup", async () => {
  const html = renderToStaticMarkup(await Dashboard());
  expect(html).toContain('href="/products/saved-plan/advisor"');
  expect(html).toContain('href="/advisor?url=https%3A%2F%2Ftwo.example%2F"');
  expect(html).toContain("Plan ready");
  expect(html).toContain("Start advisor");
  expect(html).not.toContain("Generate a report");
});
