// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Goal } from "@/lib/contracts";
import type { PostgresGoalGuardRepository } from "@/lib/db/repository";

const mocks = vi.hoisted(() => ({ callGonkaJson: vi.fn() }));
vi.mock("@/lib/gonka/client", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/gonka/client")>()), callGonkaJson: mocks.callGonkaJson }));

import { GonkaCallError } from "@/lib/gonka/client";
import { parseGoal } from "./service";

function repository() {
  let created: Goal | null = null;
  return { createGoal: vi.fn(async (goal: Goal) => { created = goal; return goal; }), saveInference: vi.fn(async () => undefined), getGoal: vi.fn(async () => created) } as unknown as PostgresGoalGuardRepository;
}

const gonkaResult = (draft: object) => ({ data: { draft }, requestId: "gonka-parse-1", model: "gonka-model-a", raw: { draft }, latencyMs: 25 });

describe("goal parsing service", () => {
  beforeEach(() => {
    mocks.callGonkaJson.mockReset();
    vi.stubEnv("GONKA_API_KEY", "test-key"); vi.stubEnv("GONKA_BASE_URL", "https://gonka.example"); vi.stubEnv("GONKA_STRATEGIST_MODEL", "gonka-model-a");
  });

  it("returns one clarification without creating an incomplete goal", async () => {
    const repo = repository(); mocks.callGonkaJson.mockResolvedValue(gonkaResult({ goalType: "rent" }));
    const result = await parseGoal({ message: "Protect my rent." }, "a".repeat(64), repo);
    expect(result.goal).toBeNull();
    expect(result.missingFields).toContain("underlyingAsset");
    expect(result.clarificationQuestion).toMatch(/crypto asset/i);
    expect(repo.createGoal).not.toHaveBeenCalled();
    expect(repo.saveInference).toHaveBeenCalledWith(expect.objectContaining({ status: "succeeded", requestId: "gonka-parse-1" }), expect.anything());
  });

  it("persists only a complete validated goal", async () => {
    const repo = repository(); mocks.callGonkaJson.mockResolvedValue(gonkaResult({ goalType: "rent", underlyingAsset: "ETH", protectedValueUsd: "100", deadline: "2099-09-30", maxLossBps: 500, maxPremiumUsd: "3" }));
    const result = await parseGoal({ message: "Protect $100 for rent by 2099-09-30 with 5% maximum loss." }, "a".repeat(64), repo);
    expect(result.missingFields).toEqual([]);
    expect(result.goal).toMatchObject({ goalType: "rent", underlyingAsset: "ETH", protectedValueUsd: "100", maxLossBps: 500 });
    expect(repo.createGoal).toHaveBeenCalledOnce();
  });

  it("records a failed inference and fails closed on Gonka errors", async () => {
    const repo = repository(); mocks.callGonkaJson.mockRejectedValue(new GonkaCallError("Gonka failed.", "gonka-failed-1"));
    await expect(parseGoal({ message: "Protect rent." }, "a".repeat(64), repo)).rejects.toMatchObject({ code: "GONKA_UNAVAILABLE", status: 502 });
    expect(repo.saveInference).toHaveBeenCalledWith(expect.objectContaining({ status: "failed", requestId: "gonka-failed-1" }));
  });
});
