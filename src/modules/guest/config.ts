import { z } from "zod";
import { AppError } from "@/lib/errors";
const schema = z.object({
  GUEST_ANALYSIS_ENABLED: z.enum(["true", "false"]).default("false"),
  GUEST_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(24),
  GUEST_IP_MODE: z.enum(["vercel", "local"]).default("vercel"),
  GUEST_IP_HASH_SECRET: z.string().min(32),
  TURNSTILE_SECRET_KEY: z.string().min(10),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(10),
  GUEST_DAILY_CAP: z.coerce.number().int().min(1).max(1000).default(20),
  GUEST_IP_DAILY_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(3),
  GUEST_IP_HOURLY_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(2),
  GUEST_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(3).default(2),
  GUEST_MAX_CONCURRENT: z.coerce.number().int().min(1).max(5).default(2),
  GUEST_MAX_PAGES: z.coerce.number().int().min(1).max(8).default(3),
  GUEST_MAX_INPUT_TOKENS: z.coerce
    .number()
    .int()
    .min(16000)
    .max(40000)
    .default(30000),
  GUEST_MAX_OUTPUT_TOKENS: z.coerce
    .number()
    .int()
    .min(3000)
    .max(8000)
    .default(6000),
  GUEST_PRICED_MODEL: z.string().min(1),
  GUEST_INPUT_USD_PER_MILLION: z.coerce.number().positive(),
  GUEST_OUTPUT_USD_PER_MILLION: z.coerce.number().positive(),
  GUEST_MAX_COST_USD: z.coerce.number().positive().max(1).default(0.03),
});
export function guestConfig() {
  const result = schema.safeParse(process.env);
  if (!result.success || result.data.GUEST_ANALYSIS_ENABLED !== "true")
    throw new AppError(
      "Free reports are temporarily unavailable. Please try again later.",
      503,
    );
  const e = result.data;
  if (
    process.env.NODE_ENV === "production" &&
    (e.GUEST_IP_MODE === "local" ||
      isTestTurnstile(e.TURNSTILE_SECRET_KEY) ||
      isTestTurnstile(e.NEXT_PUBLIC_TURNSTILE_SITE_KEY))
  )
    throw new AppError("Public guest protection is not configured.", 503);
  const upper =
    (e.GUEST_MAX_INPUT_TOKENS * e.GUEST_INPUT_USD_PER_MILLION +
      e.GUEST_MAX_OUTPUT_TOKENS * e.GUEST_OUTPUT_USD_PER_MILLION) /
    1000000;
  if (
    e.GUEST_PRICED_MODEL !== (process.env.OPENAI_MODEL || "gpt-6.1-sol") ||
    upper > e.GUEST_MAX_COST_USD
  )
    throw new AppError(
      "Free report cost limits need operator configuration.",
      503,
    );
  return { ...e, maxReservedCost: upper };
}
export function isTestTurnstile(key: string) {
  return /^[123]x0{8,}/.test(key);
}
