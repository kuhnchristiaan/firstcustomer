// Local-only migration verification. Never accepts a remote migration target.
import { Client } from "pg";
import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
const connection =
  "postgresql://firstcustomers_test@127.0.0.1:55441/firstcustomers_advisor_dev";
const db = new Client({ connectionString: connection });
await db.connect();
const target = (
  await db.query(
    "SELECT current_database() AS database, inet_server_addr() AS host, inet_server_port() AS port",
  )
).rows[0];
if (
  target.database !== "firstcustomers_advisor_dev" ||
  target.host !== "127.0.0.1" ||
  target.port !== 55441
)
  throw new Error("Unexpected migration target");
async function snapshot() {
  const entries = [];
  for (const [table, fields] of [
    ["AnalysisRun", "id || COALESCE(output::text,'')"],
    ["ProductProfile", "id || findings::text"],
    ["AdvisorStrategy", 'id || output::text || "founderContext"::text'],
    [
      "AdvisorTask",
      "id || completed::text || COALESCE(\"completedAt\"::text,'') || version::text",
    ],
  ]) {
    const value = (
      await db.query(
        `SELECT count(*)::int AS rows, md5(COALESCE(string_agg(${fields}, '' ORDER BY id),'')) AS hash FROM "${table}"`,
      )
    ).rows[0];
    entries.push({ table, ...value });
  }
  return entries;
}
const before = await snapshot();
const result = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  {
    env: {
      ...process.env,
      DATABASE_URL: connection,
      DIRECT_DATABASE_URL: connection,
      DATABASE_URL_UNPOOLED: connection,
    },
    stdio: "inherit",
    windowsHide: true,
  },
);
if (result.status !== 0) throw new Error("Local migration failed");
const after = await snapshot();
await db.end();
if (JSON.stringify(before) !== JSON.stringify(after))
  throw new Error("Historical records changed during migration");
await writeFile(
  "docs/stage-3-migration-verification.json",
  JSON.stringify({ target, before, after, preserved: true }, null, 2) + "\n",
);
console.log(
  "Local migration verified; all existing report/strategy content and task state preserved.",
);
