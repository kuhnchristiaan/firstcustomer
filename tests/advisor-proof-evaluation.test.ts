import { it, expect } from "vitest";
import OpenAI from "openai";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { resolve, dirname, basename } from "node:path";
import { execFileSync } from "node:child_process";
import { parse as parseEnv } from "dotenv";
import { validateProductProfile } from "@/modules/intelligence/product-profile";
import { generationProductContext, generationProductProfile } from "@/modules/intelligence/attribution";
import { compactAdvisorSchema, founderContextSchema, proofPolicy, strategyRequest, requestReservation } from "@/modules/advisor-proof/contract";
import { strategyMarkdown, strategyObservations, evaluationHtml } from "@/modules/advisor-proof/presentation";

const mode = process.env.STRATEGY_PROOF_MODE;
const root = resolve("docs/strategy-intelligence-proof");
const run = resolve(root, "run-1");
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const read = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const save = async (name: string, value: unknown) => writeFile(resolve(run, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const context = founderContextSchema.parse({
  productStage: "Launched, no paying customers",
  resources: { hoursPerWeek: 3, monthlyBudget: { amount: 0, currency: "USD" } },
  previousEfforts: { channels: ["None"], other: null },
});

type PreparedCase = {
  slug: string;
  context: typeof context;
  statementIds: [string, ...string[]];
  request: ReturnType<typeof strategyRequest>;
  reservation: ReturnType<typeof requestReservation>;
  evidenceHashes: Record<string, string>;
};
type Protocol = { policy: typeof proofPolicy; cases: PreparedCase[]; totalReservedUsd: number };

async function display(protocol: Protocol) {
  const cases = [];
  for (const c of protocol.cases) {
    let output = "Not run. No strategy has been generated. Paid calls require separate owner approval.";
    let metadata: unknown = c.reservation;
    try {
      metadata = await read(resolve(run, `${c.slug}-result.json`));
      output = await readFile(resolve(run, `${c.slug}-strategy.md`), "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    cases.push({ name: c.slug, context: c.context, output, metadata });
  }
  await writeFile(resolve(run, "review.html"), evaluationHtml(cases));
}

it.skipIf(!mode)("prepares, runs once after approval, or displays the Stage 2A proof", async () => {
  expect(["prepare", "live", "display"]).toContain(mode);
  if (mode === "prepare") {
    await mkdir(root, { recursive: true });
    // Never overwrite a previous prepared protocol, response or historical benchmark.
    await mkdir(run);
    const cases: PreparedCase[] = [];
    for (const slug of ["senja", "tally"]) {
      const sourcesFile = resolve(root, "evidence", `${slug}-sources.json`);
      const profileFile = resolve(root, "evidence", `${slug}-profile.json`);
      const sources = await read(sourcesFile);
      const profile = validateProductProfile(await read(profileFile), sources);
      const ids = generationProductProfile(profile).statements.map((s) => s.id);
      if (!ids.length) throw new Error("Saved profile has no attributed owner statements");
      const statementIds = ids as [string, ...string[]];
      const request = strategyRequest({ product: generationProductContext(profile), statementIds, founderContext: context });
      cases.push({ slug, context, statementIds, request, reservation: requestReservation(request), evidenceHashes: {
        [`${slug}-sources.json`]: hash(await readFile(sourcesFile, "utf8")),
        [`${slug}-profile.json`]: hash(await readFile(profileFile, "utf8")),
      } });
    }
    const protocol: Protocol = { policy: proofPolicy, cases, totalReservedUsd: cases.reduce((sum, c) => sum + c.reservation.reservedUsd, 0) };
    expect(cases).toHaveLength(proofPolicy.maxCalls);
    expect(protocol.totalReservedUsd).toBeLessThanOrEqual(proofPolicy.ceilingUsd);
    await save("protocol.json", protocol);
    const digest = hash(await readFile(resolve(run, "protocol.json"), "utf8"));
    await save("approval-request.json", { protocolSha256: digest, proposedCalls: cases.length, maximumSpendUsd: proofPolicy.ceilingUsd, reservedWorstCaseUsd: protocol.totalReservedUsd, paidCallsApproved: false });
    await display(protocol);
    console.info(JSON.stringify({ event: "strategy_proof_prepared", cases: cases.length, maximumSpendUsd: proofPolicy.ceilingUsd, reservedWorstCaseUsd: protocol.totalReservedUsd, protocolSha256: digest, paidCalls: 0 }));
    return;
  }

  const protocolText = await readFile(resolve(run, "protocol.json"), "utf8");
  const protocol: Protocol = JSON.parse(protocolText);
  expect(protocol.policy).toEqual(proofPolicy);
  if (mode === "display") {
    await display(protocol);
    return;
  }
  // Set this digest only after explicit approval of the concrete protocol in chat.
  expect(process.env.STRATEGY_PROOF_APPROVED_SHA256).toBe(hash(protocolText));
  expect(protocol.cases).toHaveLength(proofPolicy.maxCalls);
  for (const c of protocol.cases) {
    for (const [name, digest] of Object.entries(c.evidenceHashes)) {
      expect(hash(await readFile(resolve(root, "evidence", name), "utf8"))).toBe(digest);
    }
    const profile = validateProductProfile(await read(resolve(root, "evidence", `${c.slug}-profile.json`)), await read(resolve(root, "evidence", `${c.slug}-sources.json`)));
    const expectedIds = generationProductProfile(profile).statements.map((s) => s.id) as [string, ...string[]];
    expect(c.statementIds).toEqual(expectedIds);
    expect(c.request).toEqual(strategyRequest({ product: generationProductContext(profile), statementIds: expectedIds, founderContext: founderContextSchema.parse(c.context) }));
    expect(c.reservation).toEqual(requestReservation(c.request));
  }
  expect(protocol.totalReservedUsd).toBe(protocol.cases.reduce((sum, c) => sum + c.reservation.reservedUsd, 0));
  expect(protocol.totalReservedUsd).toBeLessThanOrEqual(proofPolicy.ceilingUsd);
  // File must be explicitly selected and Git-ignored. No automatic environment load.
  const envFile = process.env.STRATEGY_PROOF_ENV_FILE;
  if (!envFile || !basename(envFile).startsWith(".env") || basename(envFile) === ".env.example") throw new Error("Select an ignored FirstCustomers environment file");
  execFileSync("git", ["-C", dirname(resolve(envFile)), "check-ignore", "--quiet", "--", basename(envFile)], { stdio: "pipe" });
  const key = parseEnv(await readFile(envFile, "utf8")).OPENAI_API_KEY;
  if (!key) throw new Error("FirstCustomers API key is not configured");
  // Exclusive run lock: interrupted/uncertain attempts cannot be automatically resumed.
  await save("live-started.json", { protocolSha256: hash(protocolText), startedAt: new Date().toISOString(), maximumSpendUsd: proofPolicy.ceilingUsd });
  const api = new OpenAI({ apiKey: key, maxRetries: 0, timeout: proofPolicy.timeoutMs });
  const ledger = { calls: 0, settledUpperCostUsd: 0, uncertainReservedUsd: 0, ceilingUsd: proofPolicy.ceilingUsd };
  const updateLedger = async () => {
    await writeFile(resolve(run, "ledger.pending.json"), JSON.stringify(ledger, null, 2) + "\n");
    await rename(resolve(run, "ledger.pending.json"), resolve(run, "ledger.json"));
  };
  for (const c of protocol.cases) {
    const reserve = requestReservation(c.request).reservedUsd;
    if (ledger.calls >= proofPolicy.maxCalls || ledger.settledUpperCostUsd + ledger.uncertainReservedUsd + reserve > proofPolicy.ceilingUsd) break;
    ledger.calls++;
    ledger.uncertainReservedUsd += reserve;
    // Durable reservation must succeed before dispatch. Unknown usage retains it.
    await updateLedger();
    const started = Date.now();
    let stop = false;
    try {
      const response = await api.responses.create(c.request, { signal: AbortSignal.timeout(proofPolicy.timeoutMs) });
      await save(`${c.slug}-response.json`, response);
      await writeFile(resolve(run, `${c.slug}-output.txt`), response.output_text, { flag: "wx" });
      const usage = response.usage;
      const costUpper = usage ? (usage.input_tokens * Math.max(proofPolicy.ratesPerMillion.input, proofPolicy.ratesPerMillion.cacheWrite) + usage.output_tokens * proofPolicy.ratesPerMillion.output) / 1e6 : null;
      if (costUpper !== null) {
        ledger.uncertainReservedUsd = Math.max(0, ledger.uncertainReservedUsd - reserve);
        ledger.settledUpperCostUsd += costUpper;
        await updateLedger();
      }
      let strategy;
      try { strategy = compactAdvisorSchema(c.statementIds).parse(JSON.parse(response.output_text)); } catch { /* Original content remains available for review. */ }
      const complete = response.status === "completed" && Boolean(strategy);
      const result = { status: response.status, requestedModel: proofPolicy.model, returnedModel: response.model, serviceTier: response.service_tier, latencyMs: Date.now() - started, usage, costUpperUsd: costUpper, reservedUsd: reserve, completeStructuredOutput: complete, commerciallyApproved: false, observations: strategy ? strategyObservations(strategy) : null, incompleteDetails: response.incomplete_details };
      await save(`${c.slug}-result.json`, result);
      await writeFile(resolve(run, `${c.slug}-strategy.md`), `# ${c.slug} — genuine first-attempt candidate\n\n${complete ? "Complete API/contract output. Commercial review pending." : "Incomplete or invalid output. Original returned text follows; no repair or retry."}\n\n${complete && strategy ? strategyMarkdown(strategy) : response.output_text || "No visible strategy was returned."}`, { flag: "wx" });
      stop = !usage || (costUpper !== null && costUpper > reserve) || response.model !== proofPolicy.model || response.service_tier !== "default";
    } catch (error) {
      // No error.message, headers, request objects or credentials in saved diagnostics.
      const safe = error as { status?: number };
      await save(`${c.slug}-result.json`, { failed: true, status: typeof safe.status === "number" ? safe.status : null, latencyMs: Date.now() - started, reservedUsd: reserve, note: "Attempt preserved; uncertain reservation retained conservatively. No retry." });
      await writeFile(resolve(run, `${c.slug}-strategy.md`), `# ${c.slug}\n\nThe attempt failed. Consult the saved response/output, if present. No retry or substitute strategy.`, { flag: "wx" });
      stop = true;
    }
    await display(protocol);
    if (stop) break;
  }
  await display(protocol);
}, 300000);
