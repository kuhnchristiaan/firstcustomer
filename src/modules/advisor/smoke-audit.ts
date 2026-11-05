// Opt-in local smoke capture only; never active without the explicit environment flag.
import { readFile, writeFile, rename } from "node:fs/promises";
import { resolve } from "node:path";
import type {
  Response,
  ResponseCreateParamsNonStreaming,
} from "openai/resources/responses/responses";
import { AppError } from "@/lib/errors";

export function smokeAuditDirectory() {
  const directory = process.env.ADVISOR_SMOKE_AUDIT_DIR;
  if (!directory) return null;
  const target = new URL(process.env.DATABASE_URL ?? "http://invalid");
  const allowed = resolve("docs/stage-2b-live-smoke");
  if (
    process.env.NODE_ENV === "production" ||
    process.env.ADVISOR_FIXTURES !== "false" ||
    target.hostname !== "127.0.0.1" ||
    target.port !== "55441" ||
    target.pathname !== "/firstcustomers_advisor_dev" ||
    resolve(directory) !== allowed
  )
    throw new AppError(
      "The smoke audit requires its documented local target.",
      503,
    );
  return allowed;
}
type Ledger = {
  ceilingUsd: number;
  settledUpperUsd: number;
  uncertainReservedUsd: number;
  calls: number;
  stopped: boolean;
};
const plan = [
  { name: "advisor_product_identification", model: "gpt-4.1-mini" },
  { name: "advisor_strategy", model: "gpt-6.1-sol" },
  { name: "advisor_assistance", model: "gpt-4.1-mini" },
];
export async function auditedResponse(
  request: ResponseCreateParamsNonStreaming,
  reserve: number,
  dispatch: () => Promise<Response>,
) {
  const directory = smokeAuditDirectory();
  if (!directory) return dispatch();
  const ledgerPath = resolve(directory, "ledger.json");
  const ledger: Ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
  const format = request.text?.format;
  const name = format?.type === "json_schema" ? format.name : "unknown";
  const expected = plan[ledger.calls];
  if (
    ledger.stopped ||
    ledger.ceilingUsd !== 0.4 ||
    !expected ||
    name !== expected.name ||
    request.model !== expected.model ||
    ledger.settledUpperUsd + ledger.uncertainReservedUsd + reserve >
      ledger.ceilingUsd
  )
    throw new AppError(
      "The approved live smoke-test allowance is exhausted or mismatched.",
      429,
    );
  const prefix = `${ledger.calls + 1}-${name}`;
  const saveLedger = async () => {
    await writeFile(
      resolve(directory, "ledger.pending.json"),
      JSON.stringify(ledger, null, 2) + "\n",
    );
    await rename(resolve(directory, "ledger.pending.json"), ledgerPath);
  };
  await writeFile(
    resolve(directory, `${prefix}-request.json`),
    JSON.stringify(request, null, 2) + "\n",
    { flag: "wx" },
  );
  ledger.calls++;
  ledger.uncertainReservedUsd += reserve;
  await saveLedger(); // durable reservation before any paid request
  const started = Date.now();
  try {
    const response = await dispatch();
    const latencyMs = Date.now() - started;
    await writeFile(
      resolve(directory, `${prefix}-response.json`),
      JSON.stringify(response, null, 2) + "\n",
      { flag: "wx" },
    );
    await writeFile(
      resolve(directory, `${prefix}-output.txt`),
      response.output_text,
      { flag: "wx" },
    );
    const usage = response.usage;
    const details = usage?.input_tokens_details as
      { cached_tokens?: number; cache_write_tokens?: number } | undefined;
    const cached = details?.cached_tokens ?? 0;
    const writes = details?.cache_write_tokens ?? 0;
    const ordinary = usage ? usage.input_tokens - cached - writes : 0;
    const rates =
      request.model === "gpt-6.1-sol"
        ? { input: 2, cached: 0.1, write: 2.5, output: 10 }
        : { input: 0.4, cached: 0.1, write: 0.4, output: 1.6 };
    const cost = usage
      ? (ordinary * rates.input +
          cached * rates.cached +
          writes * rates.write +
          usage.output_tokens * rates.output) /
        1e6
      : null;
    const upper = usage
      ? (usage.input_tokens * Math.max(rates.input, rates.write) +
          usage.output_tokens * rates.output) /
        1e6
      : null;
    if (upper !== null) {
      ledger.uncertainReservedUsd = Math.max(
        0,
        ledger.uncertainReservedUsd - reserve,
      );
      ledger.settledUpperUsd += upper;
    }
    if (
      !usage ||
      ordinary < 0 ||
      (upper !== null && upper > reserve) ||
      response.status !== "completed"
    )
      ledger.stopped = true;
    await saveLedger();
    await writeFile(
      resolve(directory, `${prefix}-metrics.json`),
      JSON.stringify(
        {
          name,
          requestedModel: request.model,
          resolvedModel: response.model,
          status: response.status,
          serviceTier: response.service_tier,
          latencyMs,
          reservedUsd: reserve,
          usage,
          usageBasedEstimatedCostUsd: cost,
          conservativeCostUpperUsd: upper,
          ratesPerMillionUsd: rates,
          incompleteDetails: response.incomplete_details,
          error: response.error,
        },
        null,
        2,
      ) + "\n",
      { flag: "wx" },
    );
    return response;
  } catch (error) {
    ledger.stopped = true;
    await saveLedger();
    await writeFile(
      resolve(directory, `${prefix}-error.json`),
      JSON.stringify(
        {
          latencyMs: Date.now() - started,
          status:
            typeof (error as { status?: unknown }).status === "number"
              ? (error as { status: number }).status
              : null,
          note: "No retry. Unknown usage retains its full reservation. Provider error messages/headers are not logged.",
        },
        null,
        2,
      ),
      { flag: "wx" },
    );
    throw new AppError(
      "The live smoke attempt stopped; its evidence is preserved and no retry is allowed.",
      502,
    );
  }
}
