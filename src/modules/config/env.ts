import { z } from "zod";
const schema = z.object({
  DATABASE_URL: z.url(),
  NEON_AUTH_BASE_URL: z.url(),
  NEON_AUTH_COOKIE_SECRET: z.string().min(32),
  APP_URL: z.url(),
  DEV_LAN_ORIGIN: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.url().optional(),
  ),
  OPENAI_API_KEY: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional(),
  ),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  MOCK_ANALYSIS: z.enum(["true", "false"]).default("false"),
  MAX_PAGES: z.coerce.number().int().min(1).max(8).default(5),
  MAX_CONTENT_CHARS: z.coerce
    .number()
    .int()
    .min(1000)
    .max(40000)
    .default(24000),
  MAX_INPUT_TOKENS: z.coerce.number().int().min(4000).max(40000).default(20000),
  MAX_OUTPUT_TOKENS: z.coerce.number().int().min(1000).max(8000).default(4500),
  MONTHLY_ANALYSIS_QUOTA: z.coerce.number().int().min(1).max(1000).default(20),
  MAX_CONCURRENT_ANALYSES: z.coerce.number().int().min(1).max(3).default(1),
  OPENAI_INPUT_USD_PER_MILLION: z.coerce.number().nonnegative().optional(),
  OPENAI_OUTPUT_USD_PER_MILLION: z.coerce.number().nonnegative().optional(),
});
export function config() {
  const e = schema.parse(process.env);
  if (process.env.NODE_ENV === "production" && e.MOCK_ANALYSIS === "true")
    throw new Error("Mock analysis is forbidden in production");
  return e;
}
export function configured() {
  return Boolean(
    process.env.DATABASE_URL &&
    process.env.NEON_AUTH_BASE_URL &&
    process.env.NEON_AUTH_COOKIE_SECRET &&
    process.env.APP_URL,
  );
}
