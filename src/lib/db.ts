import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "@/modules/config/env";
import { databaseUrl } from "./database-url";
const globalDb = globalThis as unknown as { db?: PrismaClient };
export function db() {
  return (globalDb.db ??= new PrismaClient({
    adapter: new PrismaPg({
      connectionString: databaseUrl(config().DATABASE_URL),
      max: 3,
    }),
  }));
}
