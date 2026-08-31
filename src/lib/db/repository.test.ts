// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Goal } from "@/lib/contracts";
import { createDatabase } from "@/lib/db/client";
import { RepositoryConflictError, SqliteGoalGuardRepository } from "@/lib/db/repository";

let directory: string;
let database: ReturnType<typeof createDatabase>;
let repository: SqliteGoalGuardRepository;

const goal: Goal = {
  schemaVersion: 1,
  id: "4b3e798c-e0e8-4ab5-9e37-d4526424eb8f",
  goalType: "rent",
  customGoalLabel: null,
  underlyingAsset: "ETH",
  protectedValueUsd: "1200",
  deadline: "2026-09-30",
  maxLossBps: 500,
  maxPremiumUsd: null,
  originalUserMessage: "Protect my rent fund.",
  status: "draft",
  createdAt: "2026-08-31T12:00:00.000Z",
  updatedAt: "2026-08-31T12:00:00.000Z",
  parseInferenceId: null,
  selectedCandidateId: null,
  councilDecisionId: null,
  tradeId: null,
};

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "goalguard-test-"));
  database = createDatabase(`file:${join(directory, "test.db")}`);
  migrate(database.db, { migrationsFolder: "./drizzle" });
  repository = new SqliteGoalGuardRepository(database.db);
});

afterEach(() => {
  database.sqlite.close();
  rmSync(directory, { recursive: true, force: true });
});

describe("SqliteGoalGuardRepository", () => {
  it("round-trips canonical goals through database mappers", async () => {
    await repository.createGoal(goal);
    expect(await repository.getGoal(goal.id)).toEqual(goal);
  });

  it("allows forward goal transitions and rejects backward transitions", async () => {
    await repository.createGoal(goal);
    const searching = await repository.updateGoalStatus(goal.id, "searching");
    expect(searching.status).toBe("searching");
    await expect(repository.updateGoalStatus(goal.id, "draft")).rejects.toBeInstanceOf(RepositoryConflictError);
  });
});
