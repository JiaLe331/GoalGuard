import { describe, expect, it } from "vitest";

import { fixtureBlockedDecision, fixtureCandidate, fixtureDecision, fixtureDisputedDecision, fixtureGoal, fixturePhysicalCandidate, fixtureReadyGoal, fixtureTrade, getDraftGoalResponse, previewTradeResponse } from "@/test/fixtures/goalguard";
import { initialWorkflowState, workflowReducer } from "./workflow";

describe("preview-only workflow reducer", () => {
  it("hydrates a draft into confirmation", () => {
    expect(workflowReducer(initialWorkflowState, { type: "hydrate", response: getDraftGoalResponse }).stage).toBe("confirming_goal");
  });

  it.each([["approved", fixtureDecision], ["disputed", fixtureDisputedDecision], ["blocked", fixtureBlockedDecision]] as const)("maps %s council decisions to a distinct plan state", (status, decision) => {
    const next = workflowReducer({ ...initialWorkflowState, goal: fixtureGoal, selectedCandidate: fixtureCandidate }, { type: "review_completed", goal: fixtureReadyGoal, candidate: fixtureCandidate, decision });
    expect(next.stage).toBe(`plan_${status}`);
  });

  it("requires confirmation and acknowledgment before requesting a preview", () => {
    const approved = { ...initialWorkflowState, stage: "plan_approved" as const, goal: fixtureReadyGoal, selectedCandidate: fixtureCandidate, decision: fixtureDecision };
    expect(workflowReducer(approved, { type: "preview_started" })).toBe(approved);
    const confirming = workflowReducer(approved, { type: "preview_confirmation_started" });
    expect(confirming.stage).toBe("confirming_preview");
    expect(workflowReducer(confirming, { type: "preview_started" }).stage).toBe("confirming_preview");
    const acknowledged = workflowReducer(confirming, { type: "preview_acknowledgment_changed", acknowledged: true });
    expect(workflowReducer(acknowledged, { type: "preview_started" }).stage).toBe("generating_preview");
  });

  it("retains the complete preview entity and response metadata at demo ready", () => {
    const generating = { ...initialWorkflowState, stage: "generating_preview" as const, previewAcknowledged: true };
    const ready = workflowReducer(generating, { type: "preview_ready", response: previewTradeResponse });
    expect(ready.stage).toBe("demo_preview_ready");
    expect(ready.preview).toEqual(previewTradeResponse.data);
    expect(ready.previewMeta).toEqual(previewTradeResponse.meta);
    expect(ready.previewAcknowledged).toBe(false);
  });

  it("resets acknowledgment when confirmation is cancelled or invalidated", () => {
    const confirming = { ...initialWorkflowState, stage: "confirming_preview" as const, previewAcknowledged: true };
    expect(workflowReducer(confirming, { type: "preview_confirmation_cancelled" }).previewAcknowledged).toBe(false);
    expect(workflowReducer(confirming, { type: "preview_invalidated", notice: "wallet changed" }).previewAcknowledged).toBe(false);
  });

  it("additionally requires a physical-settlement-specific acknowledgment before requesting a preview for a physical candidate", () => {
    const approved = { ...initialWorkflowState, stage: "plan_approved" as const, goal: fixtureReadyGoal, selectedCandidate: fixturePhysicalCandidate, decision: fixtureDecision };
    const confirming = workflowReducer(approved, { type: "preview_confirmation_started" });
    const acknowledged = workflowReducer(confirming, { type: "preview_acknowledgment_changed", acknowledged: true });
    // The general acknowledgment alone is not enough for a physical candidate.
    expect(workflowReducer(acknowledged, { type: "preview_started" }).stage).toBe("confirming_preview");
    const bothAcknowledged = workflowReducer(acknowledged, { type: "physical_settlement_acknowledgment_changed", acknowledged: true });
    expect(workflowReducer(bothAcknowledged, { type: "preview_started" }).stage).toBe("generating_preview");
  });

  it("resets the physical-settlement acknowledgment alongside the general one", () => {
    const confirming = { ...initialWorkflowState, stage: "confirming_preview" as const, previewAcknowledged: true, physicalSettlementAcknowledged: true };
    expect(workflowReducer(confirming, { type: "preview_confirmation_cancelled" }).physicalSettlementAcknowledged).toBe(false);
    expect(workflowReducer(confirming, { type: "preview_invalidated", notice: "wallet changed" }).physicalSettlementAcknowledged).toBe(false);
  });

  it("never restores preview calldata from hydration", () => {
    const hydrated = workflowReducer(initialWorkflowState, { type: "hydrate", response: { data: { goal: fixtureReadyGoal, selectedCandidate: fixtureCandidate, councilDecision: fixtureDecision, trade: fixtureTrade }, meta: previewTradeResponse.meta } });
    expect(hydrated.stage).toBe("plan_approved");
    expect(hydrated.preview).toBeNull();
    expect(hydrated.notice).toMatch(/never restored/i);
  });

  it("contains no signing or broadcast stage", () => {
    expect(JSON.stringify(initialWorkflowState)).not.toMatch(/signature|broadcast|approval_signature/);
  });
});
