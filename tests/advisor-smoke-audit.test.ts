import { beforeEach, expect, it, vi } from "vitest";
import type {
  Response,
  ResponseCreateParamsNonStreaming,
} from "openai/resources/responses/responses";
const f = vi.hoisted(() => ({
  read: vi.fn(),
  write: vi.fn(),
  rename: vi.fn(),
}));
vi.mock("node:fs/promises", () => ({
  readFile: f.read,
  writeFile: f.write,
  rename: f.rename,
}));
import { auditedResponse } from "@/modules/advisor/smoke-audit";
import { resolve } from "node:path";
const request: ResponseCreateParamsNonStreaming = {
  model: "gpt-4.1-mini",
  max_output_tokens: 2000,
  text: {
    format: {
      type: "json_schema",
      name: "advisor_product_identification",
      schema: { type: "object" },
      strict: true,
    },
  },
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("ADVISOR_FIXTURES", "false");
  vi.stubEnv(
    "DATABASE_URL",
    "postgresql://firstcustomers_test@127.0.0.1:55441/firstcustomers_advisor_dev",
  );
  vi.stubEnv("ADVISOR_SMOKE_AUDIT_DIR", resolve("docs/stage-2b-live-smoke"));
  f.read.mockResolvedValue(
    JSON.stringify({
      ceilingUsd: 0.4,
      settledUpperUsd: 0,
      uncertainReservedUsd: 0,
      calls: 0,
      stopped: false,
    }),
  );
});
it("reserves and saves full raw output before returning it, without making a network call", async () => {
  const fake = {
    status: "completed",
    model: "gpt-4.1-mini",
    service_tier: "default",
    output_text: "Hand-authored audit transport fixture, not a real strategy.",
    usage: {
      input_tokens: 100,
      output_tokens: 100,
      input_tokens_details: { cached_tokens: 0 },
    },
  } as Response;
  const dispatch = vi.fn().mockResolvedValue(fake);
  expect(await auditedResponse(request, 0.02, dispatch)).toBe(fake);
  expect(dispatch).toHaveBeenCalledTimes(1);
  expect(
    f.write.mock.calls.some(
      ([path, content]) =>
        String(path).endsWith("-output.txt") && content === fake.output_text,
    ),
  ).toBe(true);
  const ledgerWrites = f.write.mock.calls.filter(([path]) =>
    String(path).endsWith("ledger.pending.json"),
  );
  expect(JSON.parse(ledgerWrites[0][1])).toMatchObject({
    calls: 1,
    uncertainReservedUsd: 0.02,
  });
  expect(JSON.parse(ledgerWrites.at(-1)![1])).toMatchObject({
    calls: 1,
    uncertainReservedUsd: 0,
  });
  vi.unstubAllEnvs();
});
it("refuses budget overruns and extra calls before dispatch", async () => {
  const dispatch = vi.fn();
  f.read.mockResolvedValue(
    JSON.stringify({
      ceilingUsd: 0.4,
      settledUpperUsd: 0.39,
      uncertainReservedUsd: 0,
      calls: 0,
      stopped: false,
    }),
  );
  await expect(auditedResponse(request, 0.02, dispatch)).rejects.toMatchObject({
    status: 429,
  });
  f.read.mockResolvedValue(
    JSON.stringify({
      ceilingUsd: 0.4,
      settledUpperUsd: 0,
      uncertainReservedUsd: 0,
      calls: 3,
      stopped: false,
    }),
  );
  await expect(auditedResponse(request, 0.02, dispatch)).rejects.toMatchObject({
    status: 429,
  });
  expect(dispatch).not.toHaveBeenCalled();
  vi.unstubAllEnvs();
});
it("stops on dispatch failure, retains the reservation and omits raw provider errors", async () => {
  await expect(
    auditedResponse(request, 0.02, async () => {
      throw new Error("sensitive provider error body");
    }),
  ).rejects.toMatchObject({ status: 502 });
  const ledgerWrites = f.write.mock.calls.filter(([path]) =>
    String(path).endsWith("ledger.pending.json"),
  );
  expect(JSON.parse(ledgerWrites.at(-1)![1])).toMatchObject({
    stopped: true,
    uncertainReservedUsd: 0.02,
  });
  expect(JSON.stringify(f.write.mock.calls)).not.toContain(
    "sensitive provider error body",
  );
  vi.unstubAllEnvs();
});
