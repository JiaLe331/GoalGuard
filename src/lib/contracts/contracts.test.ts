import { describe, expect, it } from "vitest";

import {
  ApiErrorResponseSchema,
  BaseUnitStringSchema,
  CouncilDecisionSchema,
  DecimalStringSchema,
  GoalSchema,
  GenerateCandidatesRequestSchema,
  IntegrationStatusResponseSchema,
  ProtectionCandidateSchema,
  PublicProtectionCandidateSchema,
  PreviewTradeResponseSchema,
  SignedDecimalStringSchema,
  UpdateGoalRequestSchema,
} from "@/lib/contracts";
import { fixtureCandidate, previewTradeResponse } from "@/test/fixtures/goalguard";

const now = "2026-08-31T12:00:00.000Z";
const ids = {
  goal: "4b3e798c-e0e8-4ab5-9e37-d4526424eb8f",
  candidate: "47de2685-f45d-41b0-b843-a7fc12bb4b3b",
  decision: "2b382784-3fe3-4eb7-8e76-dba5ab229df7",
};

describe("canonical scalar contracts", () => {
  it.each(["0", "12", "12.50"])("accepts normalized decimal %s", (value) => {
    expect(DecimalStringSchema.parse(value)).toBe(value);
  });

  it.each(["-1", "01", "+1", "1e3", "NaN", "1,000"])("rejects unsafe decimal %s", (value) => {
    expect(DecimalStringSchema.safeParse(value).success).toBe(false);
  });

  it("allows a leading minus only for signed decimals", () => {
    expect(SignedDecimalStringSchema.parse("-10.5")).toBe("-10.5");
    expect(BaseUnitStringSchema.safeParse("1.5").success).toBe(false);
  });
});

describe("canonical entity contracts", () => {
  it("rejects unknown goal fields and inconsistent custom labels", () => {
    const baseGoal = {
      schemaVersion: 2,
      id: ids.goal,
      goalType: "rent",
      customGoalLabel: null,
      underlyingAsset: "ETH",
      protectedValueUsd: "1200",
      protectThroughAt: "2099-09-29T23:59:59.999Z",
      fundsNeededAt: "2099-09-30T00:00:00.000Z",
      timezone: "UTC",
      timingConfirmed: true,
      maxLossBps: 500,
      maxPremiumUsd: null,
      originalUserMessage: "Protect my rent fund.",
      status: "draft",
      createdAt: now,
      updatedAt: now,
      parseInferenceId: null,
      selectedCandidateId: null,
      councilDecisionId: null,
      tradeId: null,
    };
    expect(GoalSchema.safeParse({ ...baseGoal, unexpected: true }).success).toBe(false);
    expect(GoalSchema.safeParse({ ...baseGoal, customGoalLabel: "Not allowed" }).success).toBe(false);
  });

  it("requires exactly one review for each council role", () => {
    const review = (role: "strategist" | "risk_auditor" | "consumer_advocate", index: number) => ({
      schemaVersion: 1,
      id: `00000000-0000-4000-8000-00000000000${index}`,
      decisionId: ids.decision,
      inferenceId: `10000000-0000-4000-8000-00000000000${index}`,
      role,
      model: "model-a",
      requestId: `gonka-${index}`,
      verdict: "approve",
      confidenceBps: 8000,
      summary: "The supplied deterministic evidence supports the goal.",
      concerns: [],
      requiredDisclosures: [],
      createdAt: now,
    });
    const valid = {
      schemaVersion: 1,
      id: ids.decision,
      goalId: ids.goal,
      candidateId: ids.candidate,
      attempt: 1,
      status: "approved",
      rulesetVersion: "1",
      approvedReviewCount: 3,
      rejectedReviewCount: 0,
      uncertainReviewCount: 0,
      blockedReasons: [],
      reviews: [review("strategist", 1), review("risk_auditor", 2), review("consumer_advocate", 3)],
      createdAt: now,
    };
    expect(CouncilDecisionSchema.parse(valid).status).toBe("approved");
    expect(CouncilDecisionSchema.safeParse({ ...valid, reviews: [review("strategist", 1), review("strategist", 2), review("consumer_advocate", 3)] }).success).toBe(false);
  });

  it("enforces full and explicit proportional-demo coverage modes", () => {
    expect(ProtectionCandidateSchema.parse(fixtureCandidate).coverageMode).toBe("full");
    expect(ProtectionCandidateSchema.safeParse({ ...fixtureCandidate, goalCoverageBps: 9999 }).success).toBe(false);
    expect(ProtectionCandidateSchema.parse({ ...fixtureCandidate, coverageMode: "proportional_demo", goalCoverageBps: 5000 }).coverageMode).toBe("proportional_demo");
    expect(ProtectionCandidateSchema.safeParse({ ...fixtureCandidate, coverageMode: "proportional_demo", goalCoverageBps: 0 }).success).toBe(false);
    expect(ProtectionCandidateSchema.safeParse({ ...fixtureCandidate, coverageMode: "proportional_demo", goalCoverageBps: 10000 }).success).toBe(false);
  });
});

describe("API envelopes", () => {
  it("redacts protocolRaw from public candidates and rejects attempts to add it back", () => {
    const { protocolRaw, ...publicFields } = fixtureCandidate;
    void protocolRaw;
    expect(PublicProtectionCandidateSchema.parse(publicFields)).not.toHaveProperty("protocolRaw");
    expect(PublicProtectionCandidateSchema.safeParse(fixtureCandidate).success).toBe(false);
  });

  it("requires strict wallet readiness and referral disclosure in trade previews", () => {
    expect(PreviewTradeResponseSchema.parse(previewTradeResponse)).toEqual(previewTradeResponse);
    const malformed = structuredClone(previewTradeResponse);
    Object.assign(malformed.data.walletReadiness.gas, { privateRpcResult: "unsafe" });
    expect(PreviewTradeResponseSchema.safeParse(malformed).success).toBe(false);
  });
  it("keeps draft goal edits strict and canonical", () => {
    const request = { goalType: "rent", customGoalLabel: null, underlyingAsset: "ETH", protectedValueUsd: "1200", protectThroughAt: "2099-09-29T23:59:59.999Z", fundsNeededAt: "2099-09-30T00:00:00.000Z", timezone: "UTC", timingConfirmed: true, maxLossBps: 500, maxPremiumUsd: "3" };
    expect(UpdateGoalRequestSchema.parse(request)).toEqual(request);
    expect(UpdateGoalRequestSchema.safeParse({ ...request, databaseGoalId: ids.goal }).success).toBe(false);
  });

  it("accepts an omitted full-mode request and requires a closed mode value", () => {
    expect(GenerateCandidatesRequestSchema.parse({ goalId: ids.goal }).coverageMode).toBeUndefined();
    expect(GenerateCandidatesRequestSchema.parse({ goalId: ids.goal, coverageMode: "proportional_demo" }).coverageMode).toBe("proportional_demo");
    expect(GenerateCandidatesRequestSchema.safeParse({ goalId: ids.goal, coverageMode: "partial" }).success).toBe(false);
  });

  it("rejects extra fields from public status responses", () => {
    const response = {
      data: {
        database: { status: "ready" },
        gonka: { status: "unconfigured", model: null, requestId: null },
        thetanuts: { status: "unconfigured", chainId: 8453, activeEthPutCount: null, marketAsOf: null },
      },
      meta: { requestId: ids.goal, timestamp: now },
    };
    expect(IntegrationStatusResponseSchema.parse(response)).toEqual(response);
    expect(IntegrationStatusResponseSchema.safeParse({ ...response, rawPayload: {} }).success).toBe(false);
  });

  it("keeps non-field API errors explicit", () => {
    expect(ApiErrorResponseSchema.parse({
      error: { code: "INTERNAL_ERROR", message: "Unexpected error", retryable: false, fieldErrors: {}, details: null },
      meta: { requestId: ids.goal, timestamp: now },
    }).error.fieldErrors).toEqual({});
  });
});
