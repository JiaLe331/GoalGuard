import { migrate } from "drizzle-orm/node-sqlite/migrator";

import { createDatabase } from "../src/lib/db/client";

const { db, sqlite, path } = createDatabase();

try {
  migrate(db, { migrationsFolder: "./drizzle" });
  console.log(`Applied migrations to ${path}`);
} finally {
  sqlite.close();
}
