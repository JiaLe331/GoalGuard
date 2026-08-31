import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";

export function databasePathFromUrl(databaseUrl = process.env.DATABASE_URL ?? "file:./data/goalguard.db") {
  if (!databaseUrl.startsWith("file:")) {
    throw new Error("DATABASE_URL must use a file: URL for the SQLite adapter.");
  }

  const path = databaseUrl.slice("file:".length);
  if (!path) {
    throw new Error("DATABASE_URL must include a SQLite file path.");
  }

  return resolve(path);
}

export function createDatabase(databaseUrl?: string) {
  const path = databasePathFromUrl(databaseUrl);
  mkdirSync(dirname(path), { recursive: true });
  const sqlite = new DatabaseSync(path);
  sqlite.exec("PRAGMA foreign_keys = ON;");
  sqlite.exec("PRAGMA journal_mode = WAL;");
  return { db: drizzle({ client: sqlite }), sqlite, path };
}

type DatabaseBundle = ReturnType<typeof createDatabase>;

const globalForDatabase = globalThis as typeof globalThis & { goalGuardDatabase?: DatabaseBundle };

export function getDatabase() {
  if (!globalForDatabase.goalGuardDatabase) {
    globalForDatabase.goalGuardDatabase = createDatabase();
  }
  return globalForDatabase.goalGuardDatabase;
}
