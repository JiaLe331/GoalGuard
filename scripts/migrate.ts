import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDatabase } from "../src/lib/db/client";

const databaseUrl = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
const { db, client } = createDatabase(databaseUrl);
try {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Applied PostgreSQL migrations.");
} finally {
  await client.end();
}
