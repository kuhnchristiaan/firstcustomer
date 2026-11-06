import { spawn } from "node:child_process";
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
  ADVISOR_FIXTURES: "true",
  ADVISOR_LIVE_ENABLED: "false",
  OPENAI_API_KEY: "local-fixture-not-a-real-key",
  OPENAI_MODEL: "gpt-4.1-mini",
  MOCK_ANALYSIS: "true",
  STRATEGY_REFINEMENT_ENABLED: "true",
  MONTHLY_ANALYSIS_QUOTA: "100",
  ADVISOR_DAILY_USD: "10",
};
const fixture = spawn(
  process.execPath,
  ["scripts/advisor-fixture-server.mjs"],
  { env, stdio: "inherit", windowsHide: true },
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
