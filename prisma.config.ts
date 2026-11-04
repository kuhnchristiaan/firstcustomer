import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";
const injectedUrl =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DIRECT_DATABASE_URL ||
  process.env.DATABASE_URL;
// Match the app's local environment; injected CI values retain precedence.
loadEnv({ path: [".env.local", ".env"], quiet: true });
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url:
      injectedUrl ||
      process.env.DATABASE_URL_UNPOOLED ||
      process.env.DIRECT_DATABASE_URL ||
      process.env.DATABASE_URL ||
      "postgresql://localhost:5432/firstcustomers",
  },
});
