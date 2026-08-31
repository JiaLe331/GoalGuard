import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL ?? "file:./data/goalguard.db";

if (!databaseUrl.startsWith("file:")) {
  throw new Error("DATABASE_URL must use a file: URL for the SQLite adapter.");
}

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl.slice("file:".length),
  },
});
