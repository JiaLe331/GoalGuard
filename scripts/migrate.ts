import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDatabase } from "../src/lib/db/client";

// Local development keeps its secrets in .env.local; deployments inject the environment
// directly. Load whichever file exists and let a missing one fall through to process.env
// rather than aborting the migration.
for (const file of [".env", ".env.local"]) {
  try { process.loadEnvFile(file); } catch { /* Not every environment ships this file. */ }
}


const databaseUrl = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
const { db, client } = createDatabase(databaseUrl);
try {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Applied PostgreSQL migrations.");
} finally {
  await client.end();
}
