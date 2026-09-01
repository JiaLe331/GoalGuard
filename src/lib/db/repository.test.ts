// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Goal } from "@/lib/contracts";
import type { GoalGuardDatabase } from "@/lib/db/client";
import { PostgresGoalGuardRepository, RepositoryConflictError } from "@/lib/db/repository";

let client: PGlite; let repository: PostgresGoalGuardRepository;
const owner = "a".repeat(64); const stranger = "b".repeat(64);
const goal: Goal = { schemaVersion: 1, id: "4b3e798c-e0e8-4ab5-9e37-d4526424eb8f", goalType: "rent", customGoalLabel: null, underlyingAsset: "ETH", protectedValueUsd: "1200", deadline: "2026-09-30", maxLossBps: 500, maxPremiumUsd: null, originalUserMessage: "Protect my rent fund.", status: "draft", createdAt: "2026-08-31T12:00:00.000Z", updatedAt: "2026-08-31T12:00:00.000Z", parseInferenceId: null, selectedCandidateId: null, councilDecisionId: null, tradeId: null };

beforeEach(async () => { client = new PGlite(); const db = drizzle({ client }); await migrate(db, { migrationsFolder: "./drizzle" }); repository = new PostgresGoalGuardRepository(db as unknown as GoalGuardDatabase); });
afterEach(async () => { await client.close(); });

describe("PostgresGoalGuardRepository", () => {
  it("round-trips canonical goals and isolates anonymous owners", async () => { await repository.createGoal(goal, owner); expect(await repository.getGoal(goal.id, owner)).toEqual(goal); expect(await repository.getGoal(goal.id, stranger)).toBeNull(); });
  it("allows forward goal transitions and rejects backward transitions", async () => { await repository.createGoal(goal, owner); const searching = await repository.updateGoalStatus(goal.id, owner, "searching"); expect(searching.status).toBe("searching"); await expect(repository.updateGoalStatus(goal.id, owner, "draft")).rejects.toBeInstanceOf(RepositoryConflictError); });
  it("tracks a fresh worker heartbeat without exposing it through public entities", async () => { expect(await repository.isWorkerHealthy()).toBe(false); await repository.heartbeat("trade-monitor", "10000000-0000-4000-8000-000000000001"); expect(await repository.isWorkerHealthy()).toBe(true); });
});
