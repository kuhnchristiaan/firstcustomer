import { z } from "zod";
import { AppError } from "@/lib/errors";

export function advisorEnabled() {
  return process.env.ADVISOR_ENABLED === "true";
}
export function advisorConfig() {
  if (!advisorEnabled())
    throw new AppError(
      "The advisor is not enabled in this workspace yet.",
      503,
    );
  const e = z
    .object({
      ADVISOR_FIXTURES: z.enum(["true", "false"]).default("false"),
      ADVISOR_LIVE_ENABLED: z.enum(["true", "false"]).default("false"),
      ADVISOR_STRATEGY_MODEL: z.string().default("gpt-6.1-sol"),
      ADVISOR_ASSIST_MODEL: z.string().default("gpt-4.1-mini"),
      ADVISOR_PROFILE_MODEL: z.string().default("gpt-4.1-mini"),
      ADVISOR_DAILY_USD: z.coerce.number().positive().max(100).default(2),
    })
    .parse(process.env);
  const fixture = e.ADVISOR_FIXTURES === "true";
  if (fixture) {
    const database = new URL(process.env.DATABASE_URL ?? "http://invalid");
    const app = new URL(process.env.APP_URL ?? "http://invalid");
    if (
      process.env.NODE_ENV === "production" ||
      database.hostname !== "127.0.0.1" ||
      database.port !== "55441" ||
      database.pathname !== "/firstcustomers_advisor_dev" ||
      !["localhost", "127.0.0.1"].includes(app.hostname)
    )
      throw new AppError(
        "Advisor fixtures require the dedicated local development database.",
        503,
      );
  }
  // Explicit model/rate pairs. Unknown models fail closed instead of borrowing rates.
  const rates = (model: string) => {
    if (model === "gpt-6.1-sol") return { input: 2.5, output: 10 };
    if (model === "gpt-4.1-mini") return { input: 0.4, output: 1.6 };
    throw new AppError(
      "Configure and review pricing before using this advisor model.",
      503,
    );
  };
  return {
    ...e,
    fixture,
    rates,
    strategyCeiling: 0.3,
    assistCeiling: 0.03,
    fixtureOrigin: "http://127.0.0.1:3103",
  };
}
