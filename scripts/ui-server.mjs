// Isolated visual QA: no production credentials or paid AI requests.
import { spawn } from "node:child_process";
const mode = process.argv[2] ?? "dev";
const env = {
  ...process.env,
  FIRSTCUSTOMERS_UI_QA: "true",
  NODE_ENV: mode === "dev" ? "development" : "production",
  APP_URL: "http://localhost:3100",
  DATABASE_URL: "postgresql://firstcustomers_test@127.0.0.1:55439/postgres",
  NEON_AUTH_BASE_URL: "https://auth.example.invalid/auth",
  NEON_AUTH_COOKIE_SECRET:
    "local-ui-fixture-cookie-secret-more-than-32-characters",
  MOCK_ANALYSIS: mode === "dev" ? "true" : "false",
  OPENAI_API_KEY: "local-ui-fixture-not-a-real-key",
  OPENAI_MODEL: "gpt-4.1-mini",
  GUEST_ANALYSIS_ENABLED: "true",
  GUEST_IP_MODE: mode === "dev" ? "local" : "vercel",
  GUEST_IP_HASH_SECRET: "local-ui-fixture-protection-secret-over-32-characters",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "local-ui-fixture-site-key",
  TURNSTILE_SECRET_KEY: "local-ui-fixture-secret-key",
  GUEST_PRICED_MODEL: "gpt-4.1-mini",
  GUEST_INPUT_USD_PER_MILLION: "0.4",
  GUEST_OUTPUT_USD_PER_MILLION: "1.6",
  STRATEGY_REFINEMENT_ENABLED: "true",
};
const args =
  mode === "build"
    ? ["build", "--webpack"]
    : mode === "start"
      ? ["start", "--hostname", "127.0.0.1", "--port", "3100"]
      : ["dev", "--webpack", "--hostname", "127.0.0.1", "--port", "3100"];
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", ...args],
  { env, stdio: "inherit", windowsHide: true },
);
child.on("exit", (code) => process.exit(code ?? 1));
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
