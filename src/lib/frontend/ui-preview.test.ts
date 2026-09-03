import { describe, expect, it } from "vitest";

import {
  CouncilDecisionSchema,
  GoalSchema,
  PreviewTradeResponseSchema,
  PublicProtectionCandidateSchema,
} from "@/lib/contracts";
import {
  fixtureBlockedDecision,
  fixtureDecision,
  fixtureDisputedDecision,
  fixtureGoal,
  fixturePublicCandidate,
  previewTradeResponse,
} from "@/test/fixtures/goalguard";
import { isDevelopmentUiPreview, parseUiPreviewState, uiPreviewStates } from "./ui-preview";

describe("development UI preview boundary", () => {
  it("is available only in the development environment", () => {
    expect(isDevelopmentUiPreview("development")).toBe(true);
    expect(isDevelopmentUiPreview("production")).toBe(false);
    expect(isDevelopmentUiPreview("test")).toBe(false);
    expect(isDevelopmentUiPreview(undefined)).toBe(false);
  });

  it("accepts only the documented URL-addressable states", () => {
    for (const state of uiPreviewStates) expect(parseUiPreviewState(state.value)).toBe(state.value);
    expect(parseUiPreviewState("signing")).toBe("goal-confirmation");
    expect(parseUiPreviewState(undefined)).toBe("goal-confirmation");
  });

  it("keeps all preview samples compatible with the canonical schemas", () => {
    expect(() => GoalSchema.parse(fixtureGoal)).not.toThrow();
    expect(() => PublicProtectionCandidateSchema.parse(fixturePublicCandidate)).not.toThrow();
    expect(() => CouncilDecisionSchema.parse(fixtureDecision)).not.toThrow();
    expect(() => CouncilDecisionSchema.parse(fixtureDisputedDecision)).not.toThrow();
    expect(() => CouncilDecisionSchema.parse(fixtureBlockedDecision)).not.toThrow();
    expect(() => PreviewTradeResponseSchema.parse(previewTradeResponse)).not.toThrow();
  });
});
