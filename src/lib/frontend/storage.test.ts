import { beforeEach, describe, expect, it } from "vitest";
import { readRecentGoals, saveRecentGoal, storageKeys, type RecentGoalEntry } from "./storage";

const entry = (id: string, createdAt: string): RecentGoalEntry => ({
  id, createdAt, goalType: "emergency", customGoalLabel: null, protectedValueUsd: "100",
});

describe("recent goals storage", () => {
  beforeEach(() => window.localStorage.clear());

  it("saves and reads back a recent goal", () => {
    saveRecentGoal(entry("10000000-0000-4000-8000-000000000001", "2026-08-31T12:00:00.000Z"));
    expect(readRecentGoals()).toEqual([entry("10000000-0000-4000-8000-000000000001", "2026-08-31T12:00:00.000Z")]);
  });

  it("moves a re-saved goal to the front instead of duplicating it", () => {
    saveRecentGoal(entry("10000000-0000-4000-8000-000000000001", "2026-08-31T12:00:00.000Z"));
    saveRecentGoal(entry("20000000-0000-4000-8000-000000000002", "2026-08-31T12:05:00.000Z"));
    saveRecentGoal(entry("10000000-0000-4000-8000-000000000001", "2026-08-31T12:10:00.000Z"));
    const saved = readRecentGoals();
    expect(saved).toHaveLength(2);
    expect(saved[0]!.id).toBe("10000000-0000-4000-8000-000000000001");
    expect(saved[0]!.createdAt).toBe("2026-08-31T12:10:00.000Z");
  });

  it("caps the list at 8 entries, dropping the oldest", () => {
    for (let index = 0; index < 10; index += 1) {
      saveRecentGoal(entry(`1000000${index}-0000-4000-8000-00000000000${index}`, `2026-08-31T12:0${index}:00.000Z`));
    }
    expect(readRecentGoals()).toHaveLength(8);
  });

  it("ignores corrupted or invalid stored data instead of throwing", () => {
    window.localStorage.setItem(storageKeys.recentGoals, "not json");
    expect(readRecentGoals()).toEqual([]);
    window.localStorage.setItem(storageKeys.recentGoals, JSON.stringify([{ id: "not-a-uuid" }]));
    expect(readRecentGoals()).toEqual([]);
  });
});
