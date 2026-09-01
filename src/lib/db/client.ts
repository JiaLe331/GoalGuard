import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export function createDatabase(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl?.startsWith("postgres")) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection URL (use the Supabase transaction pooler on Vercel).");
  }

  const client = postgres(databaseUrl, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return { db: drizzle({ client }), client };
}

export type GoalGuardDatabase = ReturnType<typeof createDatabase>["db"];
type DatabaseBundle = ReturnType<typeof createDatabase>;
const globalForDatabase = globalThis as typeof globalThis & { goalGuardDatabase?: DatabaseBundle };

export function getDatabase() {
  if (!globalForDatabase.goalGuardDatabase) globalForDatabase.goalGuardDatabase = createDatabase();
  return globalForDatabase.goalGuardDatabase;
}
