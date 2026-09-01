import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
if (!databaseUrl?.startsWith("postgres")) throw new Error("DATABASE_DIRECT_URL (or DATABASE_URL) must be a PostgreSQL URL.");

export default defineConfig({ dialect: "postgresql", schema: "./src/lib/db/schema.ts", out: "./drizzle", dbCredentials: { url: databaseUrl } });
