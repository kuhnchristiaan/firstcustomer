// Authorized one-run development launcher. Never loads production model/DB settings.
import { spawn, execFileSync } from "node:child_process";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname, basename } from "node:path";
import { parse } from "dotenv";
const audit = resolve("docs/stage-2b-live-smoke");
const envFile = process.env.FIRSTCUSTOMERS_SMOKE_ENV_FILE;
if (!envFile || basename(envFile) !== ".env.local")
  throw new Error("Select the ignored FirstCustomers .env.local file.");
execFileSync(
  "git",
  [
    "-C",
    dirname(resolve(envFile)),
    "check-ignore",
    "--quiet",
    "--",
    basename(envFile),
  ],
  { stdio: "pipe" },
);
const key = parse(await readFile(envFile, "utf8")).OPENAI_API_KEY;
if (!key) throw new Error("FirstCustomers OpenAI key is missing.");
await mkdir(audit); // refuse to overwrite/resume an earlier paid attempt
await writeFile(
  resolve(audit, "ledger.json"),
  JSON.stringify(
    {
      ceilingUsd: 0.4,
      settledUpperUsd: 0,
      uncertainReservedUsd: 0,
      calls: 0,
      stopped: false,
    },
    null,
    2,
  ),
);
await writeFile(
  resolve(audit, "authorization.json"),
  JSON.stringify(
    {
      website: "https://senja.io/",
      founderContext: {
        productStage: "Launched, no paying customers",
        resources: {
          hoursPerWeek: 3,
          monthlyBudget: { amount: 0, currency: "USD" },
        },
        previousEfforts: { channels: ["None"], other: null },
      },
      maxCalls: 3,
      totalCeilingUsd: 0.4,
      retryCount: 0,
      repairCount: 0,
      auth: "Existing adapter with loopback auth upstream; isolated local account",
      aiAndWebsite:
        "Real OpenAI Responses API and real SSRF-protected website crawl",
      startedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
const env = {
  ...process.env,
  NODE_ENV: "development",
  DATABASE_URL:
    "postgresql://firstcustomers_test@127.0.0.1:55441/firstcustomers_advisor_dev",
  DIRECT_DATABASE_URL:
    "postgresql://firstcustomers_test@127.0.0.1:55441/firstcustomers_advisor_dev",
  DATABASE_URL_UNPOOLED:
    "postgresql://firstcustomers_test@127.0.0.1:55441/firstcustomers_advisor_dev",
  APP_URL: "http://localhost:3100",
  NEON_AUTH_BASE_URL: "http://127.0.0.1:3103/auth",
  NEON_AUTH_COOKIE_SECRET:
    "advisor-local-fixture-cookie-secret-over-32-characters",
  ADVISOR_ENABLED: "true",
  ADVISOR_FIXTURES: "false",
  ADVISOR_LIVE_ENABLED: "true",
  ADVISOR_SMOKE_AUDIT_DIR: audit,
  ADVISOR_STRATEGY_MODEL: "gpt-6.1-sol",
  ADVISOR_PROFILE_MODEL: "gpt-4.1-mini",
  ADVISOR_ASSIST_MODEL: "gpt-4.1-mini",
  OPENAI_API_KEY: key,
  OPENAI_MODEL: "gpt-4.1-mini",
  MOCK_ANALYSIS: "false",
  STRATEGY_REFINEMENT_ENABLED: "false",
  ADVISOR_DAILY_USD: "10",
};
const fixture = spawn(
  process.execPath,
  ["scripts/advisor-fixture-server.mjs"],
  {
    env: {
      ...env,
      OPENAI_API_KEY: "unused-local-auth-fixture",
      ADVISOR_AUTH_ONLY: "true",
    },
    stdio: "inherit",
    windowsHide: true,
  },
);
const app = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--webpack",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3100",
  ],
  { env, stdio: "inherit", windowsHide: true },
);
for (const child of [fixture, app])
  child.on("exit", (code) => {
    if (code) {
      fixture.kill();
      app.kill();
      process.exit(code);
    }
  });
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    fixture.kill();
    app.kill();
    process.exit(0);
  });
