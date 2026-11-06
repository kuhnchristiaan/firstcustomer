import { it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
const transport = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("openai", () => ({
  default: class {
    responses = { create: transport.create };
  },
}));
import { reviewAdvisor } from "@/modules/advisor/provider";
import { weeklyDecisionLabel } from "@/modules/advisor/weekly-presentation";
const proposal = JSON.parse(
  readFileSync("docs/stage-3-live-acceptance/run-1/1-output.txt", "utf8"),
);
afterEach(() => vi.unstubAllEnvs());
it("clarifies execution-only Adjust without mutating decisions or historical output", () => {
  const current = proposal.proposedPlan;
  const snapshot = JSON.stringify(proposal);
  expect(weeklyDecisionLabel("Adjust", current, current)).toBe(
    "Keep strategy — adjust execution",
  );
  expect(weeklyDecisionLabel("Continue", current, current)).toBe("Continue");
  expect(weeklyDecisionLabel("Reconsider", current, current)).toBe(
    "Reconsider",
  );
  expect(
    weeklyDecisionLabel("Adjust", current, {
      ...current,
      channel: { ...current.channel, name: "Different channel" },
    }),
  ).toBe("Adjust");
  expect(JSON.stringify(proposal)).toBe(snapshot);
});
it("passes confirmed founder facts unchanged and requests scoped verification and activity-based estimates", async () => {
  vi.stubEnv("ADVISOR_ENABLED", "true");
  vi.stubEnv("ADVISOR_FIXTURES", "false");
  vi.stubEnv("ADVISOR_LIVE_ENABLED", "true");
  vi.stubEnv("OPENAI_API_KEY", "test-transport-only");
  vi.stubEnv("DATABASE_URL", "postgresql://test@localhost/test");
  vi.stubEnv("APP_URL", "http://localhost:3100");
  vi.stubEnv("NEON_AUTH_BASE_URL", "http://localhost/auth");
  vi.stubEnv(
    "NEON_AUTH_COOKIE_SECRET",
    "test-cookie-secret-longer-than-32-characters",
  );
  const input = {
    founderContext: {
      confirmedProductFacts: {
        pricing: "Founder-confirmed existing offer",
        provenance: "Founder supplied",
      },
    },
    results: { replies: 2, activations: 0 },
  };
  transport.create.mockResolvedValue({
    status: "completed",
    model: "gpt-6.1-sol",
    usage: {
      input_tokens: 100,
      output_tokens: 100,
      output_tokens_details: { reasoning_tokens: 0 },
    },
    output_text: JSON.stringify(proposal),
  });
  const output = await reviewAdvisor(input, ["s1", "s2", "s3", "s4"], []);
  expect(output).toEqual(proposal);
  const request = transport.create.mock.calls[0][0];
  expect(JSON.parse(request.input[1].content)).toEqual(input);
  expect(request.input[0].content).toContain(
    "Treat known facts as inputs, not research assignments",
  );
  expect(request.input[0].content).toContain("representative subset");
  expect(request.input[0].content).toContain("85%");
  expect(request).toMatchObject({
    model: "gpt-6.1-sol",
    max_output_tokens: 12000,
  });
});
