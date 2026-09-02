import { describe, expect, it } from "vitest";

import { fixtureBlockedDecision, fixtureCandidate, fixtureDecision, fixtureDisputedDecision, fixtureGoal, fixtureReadyGoal, getDraftGoalResponse, previewTradeResponse } from "@/test/fixtures/goalguard";
import { initialWorkflowState, workflowReducer } from "./workflow";

describe("workflow reducer", () => {
  it("hydrates a draft into confirmation", () => {
    expect(workflowReducer(initialWorkflowState, { type: "hydrate", response: getDraftGoalResponse }).stage).toBe("confirming_goal");
  });

  it.each([
    ["approved", fixtureDecision],
    ["disputed", fixtureDisputedDecision],
    ["blocked", fixtureBlockedDecision],
  ] as const)("maps %s council decisions to a distinct plan state", (status, decision) => {
    const next = workflowReducer({ ...initialWorkflowState, goal: fixtureGoal, selectedCandidate: fixtureCandidate }, { type: "review_completed", goal: fixtureReadyGoal, candidate: fixtureCandidate, decision });
    expect(next.stage).toBe(`plan_${status}`);
  });

  it("ends the demo lifecycle at the unsigned preview", () => {
    const next = workflowReducer(initialWorkflowState, { type: "preview_ready", preview: previewTradeResponse.data });
    expect(next.stage).toBe("preview_ready");
    expect(next.preview?.trade.status).toBe("previewed");
    expect(next.preview?.trade.txHash).toBeNull();
  });
});
