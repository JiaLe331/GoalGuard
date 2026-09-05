import { describe, expect, it } from "vitest";

import { fixtureGoal } from "@/test/fixtures/goalguard";

import {
  renderAlerts,
  renderGoals,
  renderPreviewReady,
  renderStatus,
  renderTelegramPayload,
} from "./messages";

describe("deterministic Telegram messages", () => {
  it("keeps status and goal summaries owner-safe", () => {
    const status = renderStatus(fixtureGoal);
    const goals = renderGoals([fixtureGoal]);
    expect(status).toContain("Latest GoalGuard plan");
    expect(status).toContain("Deadline: Sep 30, 2099");
    expect(goals).toContain("1. Rent · Sep 30, 2099 · draft");
    expect(`${status}\n${goals}`).not.toMatch(/owner|session|telegram|request|inference|wallet/i);
  });

  it("renders all preference controls explicitly", () => {
    const message = renderAlerts({ councilResults: true, previewReady: false, previewExpiring: false, goalDeadlines: true, optionExpiry: false });
    expect(message).toContain("Council results: On");
    expect(message).toContain("Unsigned preview ready: Off");
    expect(message).toContain("/alerts preview-expiry on|off");
    expect(message).toContain("/unlink");
  });

  it("uses decimal formatting and mandatory demo/physical disclosures", () => {
    const message = renderPreviewReady({
      kind: "preview_ready",
      goalId: "4b3e798c-e0e8-4ab5-9e37-d4526424eb8f",
      goalLabel: "Rent",
      premiumUsd: "1234.567",
      previewExpiresAt: "2026-09-05T08:00:00.000Z",
      coverageMode: "proportional_demo",
      goalCoverageBps: 3750,
      settlementType: "physical",
    });
    expect(message).toContain("Proposed cost: $1,234.57");
    expect(message).toContain("Coverage: 37.5% of the goal value. This demo does not fully cover the goal.");
    expect(message).toContain("your covered ETH may be delivered/exchanged");
    expect(message).toContain("No wallet signature was requested. No funds moved, and no protected position was created.");
  });

  it("renders lifecycle payloads through the same deterministic dispatcher", () => {
    const message = renderTelegramPayload({
      kind: "council_approved",
      goalId: "4b3e798c-e0e8-4ab5-9e37-d4526424eb8f",
      goalLabel: "Rent",
      protectedValueUsd: "1200",
      approvedReviewCount: 3,
      premiumUsd: "3",
      protectionEndsAt: "2026-09-30T12:00:00.000Z",
    });
    expect(message).toContain("Council checks passed");
    expect(message).toContain("No transaction has been signed or sent.");
  });
});
