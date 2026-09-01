// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { publicCandidate } from "@/lib/contracts";
import type { PostgresGoalGuardRepository } from "@/lib/db/repository";
import { hashJson } from "@/lib/domain/hash";
import { fixtureCandidate, fixtureDecision, fixtureReadyGoal } from "@/test/fixtures/goalguard";

const mocks = vi.hoisted(() => ({ callGonkaJson: vi.fn() }));
vi.mock("@/lib/gonka/client", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/gonka/client")>()), callGonkaJson: mocks.callGonkaJson }));

import { GonkaCallError } from "@/lib/gonka/client";
import { reviewCandidate } from "./service";

function repository(latest: { decision: typeof fixtureDecision; inputHash: string } | null = null) {
  return { getLatestDecisionRecord: vi.fn(async () => latest), saveInference: vi.fn(async () => undefined), saveDecision: vi.fn(async (decision) => decision) } as unknown as PostgresGoalGuardRepository;
}

function approve(role: string, model: string) {
  return { data: { verdict: "approve", confidenceBps: 8500, summary: `${role} approves.`, concerns: [], requiredDisclosures: [] }, requestId: `gonka-${role}`, model, raw: { verdict: "approve" }, latencyMs: 20 };
}

describe("Gonka council service", () => {
  beforeEach(() => {
    mocks.callGonkaJson.mockReset();
    vi.stubEnv("GONKA_API_KEY", "test-key"); vi.stubEnv("GONKA_BASE_URL", "https://gonka.example");
    vi.stubEnv("GONKA_STRATEGIST_MODEL", "model-a"); vi.stubEnv("GONKA_RISK_AUDITOR_MODEL", "model-b"); vi.stubEnv("GONKA_CONSUMER_ADVOCATE_MODEL", "model-a");
  });

  it("runs exactly three independent roles and persists deterministic approval", async () => {
    const repo = repository();
    mocks.callGonkaJson.mockImplementation(async ({ input, model }) => approve((input as { role: string }).role, model));
    const result = await reviewCandidate(fixtureReadyGoal, fixtureCandidate, "a".repeat(64), false, repo);
    expect(result).toMatchObject({ status: "approved", approvedReviewCount: 3, rejectedReviewCount: 0, uncertainReviewCount: 0 });
    expect(result.reviews.map(({ role }) => role).sort()).toEqual(["consumer_advocate", "risk_auditor", "strategist"]);
    expect(new Set(result.reviews.map(({ model }) => model)).size).toBe(2);
    expect(repo.saveInference).toHaveBeenCalledTimes(3);
    expect(repo.saveDecision).toHaveBeenCalledOnce();
  });

  it("returns a matching cached decision without calling Gonka", async () => {
    const normalizedGoal = { goalType: fixtureReadyGoal.goalType, customGoalLabel: fixtureReadyGoal.customGoalLabel, underlyingAsset: fixtureReadyGoal.underlyingAsset, protectedValueUsd: fixtureReadyGoal.protectedValueUsd, deadline: fixtureReadyGoal.deadline, maxLossBps: fixtureReadyGoal.maxLossBps, maxPremiumUsd: fixtureReadyGoal.maxPremiumUsd };
    const inputHash = hashJson({ goal: normalizedGoal, candidate: publicCandidate(fixtureCandidate), rulesetVersion: "1" });
    const repo = repository({ decision: fixtureDecision, inputHash });
    await expect(reviewCandidate(fixtureReadyGoal, fixtureCandidate, "a".repeat(64), false, repo)).resolves.toEqual(fixtureDecision);
    expect(mocks.callGonkaJson).not.toHaveBeenCalled();
  });

  it("blocks persistence when any independent role fails", async () => {
    const repo = repository();
    mocks.callGonkaJson.mockImplementation(async ({ input, model }) => {
      const role = (input as { role: string }).role;
      if (role === "risk_auditor") throw new GonkaCallError("Risk review unavailable.", "gonka-risk-failed");
      return approve(role, model);
    });
    await expect(reviewCandidate(fixtureReadyGoal, fixtureCandidate, "a".repeat(64), false, repo)).rejects.toMatchObject({ code: "GONKA_UNAVAILABLE", status: 502 });
    expect(repo.saveInference).toHaveBeenCalledTimes(3);
    expect(repo.saveDecision).not.toHaveBeenCalled();
  });
});
