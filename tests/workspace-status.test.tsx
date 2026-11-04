import { it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const f = vi.hoisted(() => ({
  refresh: vi.fn(),
  effects: [] as (() => void | (() => void))[],
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: f.refresh }),
}));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useEffect: (effect: () => void | (() => void)) => {
    f.effects.push(effect);
  },
}));
import { WorkspaceOverview } from "@/components/workspace-shell";
import { WorkspaceRefresh } from "@/components/workspace-refresh";
import { UrlForm } from "@/components/url-form";
import { analysisStatus, activeAnalysis } from "@/modules/analysis/status";
import { enforceLimits } from "@/modules/usage/limits";
import { failure } from "@/lib/http";
beforeEach(() => {
  f.effects = [];
  f.refresh.mockClear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it.each(["FAILED", "RUNNING", "DRAFT"])(
  "never labels a %s report ready for review",
  (status) => {
    const html = renderToStaticMarkup(
      <WorkspaceOverview
        products={[
          {
            id: "fixture",
            name: "Test SaaS",
            websiteUrl: "https://example.invalid",
            status: "ACTIVE",
            latestStatus: status,
            approvedVersion: null,
            updatedLabel: "4 Nov",
          },
        ]}
        monthly={1}
        quota={20}
        form={null}
        signOut={null}
      />,
    );
    expect(html).not.toContain("Ready for your review");
    expect(html).toContain(
      status === "FAILED"
        ? "Open the product to retry"
        : status === "RUNNING"
          ? "page updates automatically"
          : "Generate a report to get started",
    );
  },
);
it("preserves approved strategy access after a later failed attempt", () => {
  const html = renderToStaticMarkup(
    <WorkspaceOverview
      products={[
        {
          id: "fixture",
          name: "Test SaaS",
          websiteUrl: "https://example.invalid",
          status: "ACTIVE",
          latestStatus: "FAILED",
          approvedVersion: 2,
          updatedLabel: "4 Nov",
        },
      ]}
      monthly={1}
      quota={20}
      form={null}
      signOut={null}
    />,
  );
  expect(html).toContain(
    "Latest attempt failed. Approved strategy v2 is still available.",
  );
});
it("treats the exact lease deadline as expired without changing completed statuses", () => {
  const now = new Date("2026-11-04T12:00:00Z");
  const expired = { status: "RUNNING", leaseExpiresAt: now };
  expect(analysisStatus(expired, now)).toBe("FAILED");
  expect(activeAnalysis(expired, now)).toBe(false);
  expect(
    activeAnalysis(
      { ...expired, leaseExpiresAt: new Date(now.getTime() + 1) },
      now,
    ),
  ).toBe(true);
  expect(analysisStatus({ ...expired, status: "SUCCEEDED" }, now)).toBe(
    "SUCCEEDED",
  );
});
it("disables duplicate submission and retains the URL while another report builds", () => {
  const html = renderToStaticMarkup(
    <UrlForm
      authenticated
      initialUrl="plausible.io"
      processing
      processingHref="/products/owned-fixture"
    />,
  );
  expect(html).toContain('value="plausible.io"');
  expect(html).toContain("Report in progress");
  expect(html).toMatch(/<button[^>]*disabled/);
  expect(html).toContain('href="/products/owned-fixture"');
});
it("refreshes active visible workspaces, pauses hidden tabs and cleans up polling", () => {
  vi.useFakeTimers();
  const windowTarget = new EventTarget();
  const documentTarget = Object.assign(new EventTarget(), {
    visibilityState: "visible",
  });
  vi.stubGlobal("window", windowTarget);
  vi.stubGlobal("document", documentTarget);
  WorkspaceRefresh({ active: true });
  const cleanup = f.effects[0]();
  vi.advanceTimersByTime(5000);
  expect(f.refresh).toHaveBeenCalledTimes(1);
  documentTarget.visibilityState = "hidden";
  vi.advanceTimersByTime(10000);
  expect(f.refresh).toHaveBeenCalledTimes(1);
  documentTarget.visibilityState = "visible";
  documentTarget.dispatchEvent(new Event("visibilitychange"));
  expect(f.refresh).toHaveBeenCalledTimes(2);
  if (typeof cleanup === "function") cleanup();
  vi.advanceTimersByTime(15000);
  windowTarget.dispatchEvent(new Event("focus"));
  expect(f.refresh).toHaveBeenCalledTimes(2);
});
it("does not poll completed workspaces but refreshes when returning to the page", () => {
  vi.useFakeTimers();
  const w = new EventTarget(),
    d = Object.assign(new EventTarget(), { visibilityState: "visible" });
  vi.stubGlobal("window", w);
  vi.stubGlobal("document", d);
  WorkspaceRefresh({ active: false });
  const cleanup = f.effects[0]();
  vi.advanceTimersByTime(20000);
  expect(f.refresh).not.toHaveBeenCalled();
  w.dispatchEvent(new Event("pageshow"));
  expect(f.refresh).toHaveBeenCalledOnce();
  if (typeof cleanup === "function") cleanup();
});
it("returns a machine-readable busy code while keeping concurrency protection", async () => {
  let error: unknown;
  try {
    enforceLimits(
      { monthly: 0, running: 1, recent: 0 },
      { monthly: 20, concurrent: 1 },
    );
  } catch (e) {
    error = e;
  }
  const response = failure(error);
  expect(response.status).toBe(429);
  expect(await response.json()).toMatchObject({ code: "analysis_busy" });
});
