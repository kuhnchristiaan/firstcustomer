import { describe, it, expect } from "vitest";
import { normalizeUrl, publicAddress } from "@/modules/website/safe-fetch";
import { extract } from "@/modules/website/extract";
import { enforceLimits } from "@/modules/usage/limits";
import { reportSchema, validateEvidence } from "@/modules/intelligence/schema";
import { mockReport } from "@/modules/analysis/mock";
describe("public URL boundary", () => {
  it.each([
    "http://localhost",
    "http://127.0.0.1",
    "http://169.254.169.254",
    "http://10.0.0.1",
    "http://2130706433",
    "http://[::1]",
    "http://[::ffff:127.0.0.1]",
    "file:///etc/passwd",
    "http://user:pass@example.com",
    "http://example.com:8080",
    "http://foo.local",
  ])("blocks %s", (u) => expect(() => normalizeUrl(u)).toThrow());
  it.each([
    "127.1.2.3",
    "10.0.0.2",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:10.0.0.1",
    "100.64.0.1",
    "224.0.0.1",
    "0.0.0.0",
  ])("blocks non-public DNS answer %s", (ip) =>
    expect(publicAddress(ip)).toBe(false),
  );
  it("normalizes a public website", () => {
    expect(normalizeUrl("example.com/#home")).toBe("https://example.com/");
    expect(publicAddress("93.184.216.34")).toBe(true);
  });
});
describe("extraction", () => {
  it("removes scripts and navigation while retaining source identity", () => {
    const s = extract(
      '<html><head><title>Useful SaaS</title></head><body><nav>unwanted navigation</nav><main><h1>Onboarding analytics for SaaS founders</h1><p>Find the step where trial users stop making progress.</p><a href="/pricing">Pricing</a></main><script>steal credentials</script></body></html>',
      "https://example.com",
    );
    expect(s.title).toBe("Useful SaaS");
    expect(s.content).toContain("Onboarding");
    expect(s.content).not.toContain("steal");
    expect(s.content).not.toContain("unwanted");
    expect(s.links).toContain("/pricing");
    expect(s.contentHash).toHaveLength(64);
  });
});
describe("quota enforcement", () => {
  it("allows an available slot", () =>
    expect(() =>
      enforceLimits(
        { monthly: 1, running: 0, recent: 0 },
        { monthly: 20, concurrent: 1 },
      ),
    ).not.toThrow());
  it.each([
    { monthly: 20, running: 0, recent: 0 },
    { monthly: 0, running: 1, recent: 0 },
    { monthly: 0, running: 0, recent: 3 },
  ])("rejects exhausted limits", (counts) =>
    expect(() =>
      enforceLimits(counts, { monthly: 20, concurrent: 1 }),
    ).toThrow(),
  );
});
describe("versioned report contract", () => {
  it("normalizes equivalent evidence URLs back to the fetched source", () => {
    const report = structuredClone(mockReport);
    report.overview = {
      text: "Published capability",
      confidence: "Verified",
      sources: ["https://example.com"],
    };
    expect(
      validateEvidence(report, ["https://example.com/"]).overview.sources,
    ).toEqual(["https://example.com/"]);
  });
  it("prevents strategies from claiming verified channel performance in the generation schema", () => {
    expect(
      reportSchema.safeParse({
        ...mockReport,
        positioning: { ...mockReport.positioning, confidence: "Verified" },
      }).success,
    ).toBe(false);
  });
  it("accepts the complete sample", () =>
    expect(reportSchema.parse(mockReport).schemaVersion).toBe("1.0"));
  it("requires three prioritized customer profiles", () =>
    expect(
      reportSchema.safeParse({
        ...mockReport,
        idealCustomers: mockReport.idealCustomers.slice(1),
      }).success,
    ).toBe(false));
  it("rejects malformed or incomplete responses", () => {
    expect(reportSchema.safeParse({ businessName: "Made up" }).success).toBe(
      false,
    );
    expect(
      reportSchema.safeParse({ ...mockReport, thirtyDayPlan: [] }).success,
    ).toBe(false);
  });
  it("rejects verified conclusions without evidence", () =>
    expect(() =>
      validateEvidence(
        {
          ...mockReport,
          overview: {
            text: "A claimed fact",
            confidence: "Verified",
            sources: [],
          },
        },
        [],
      ),
    ).toThrow());
  it("rejects hallucinated source URLs", () =>
    expect(() =>
      validateEvidence(
        {
          ...mockReport,
          overview: {
            text: "A claimed fact",
            confidence: "Verified",
            sources: ["https://invented.com"],
          },
        },
        ["https://example.com"],
      ),
    ).toThrow());
  it("allows supported website references", () =>
    expect(
      validateEvidence(
        {
          ...mockReport,
          overview: {
            text: "Published capability",
            confidence: "Verified",
            sources: ["https://example.com"],
          },
        },
        ["https://example.com"],
      ),
    ).toBeTruthy());
});
