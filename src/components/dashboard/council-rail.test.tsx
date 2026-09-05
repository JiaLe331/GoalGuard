import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { fixtureBlockedDecision, fixtureDecision, fixtureDisputedDecision, fixtureGoal, fixturePublicCandidate } from "@/test/fixtures/goalguard";
import { CouncilRail } from "./council-rail";

describe("CouncilRail", () => {
  it("shows every saved verdict and hoists the approved plan action", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    const onRefresh = vi.fn();
    render(
      <CouncilRail
        stage="plan_approved"
        councilProgress={null}
        reviewStartedAt={null}
        decision={fixtureDecision}
        planStale={false}
        onOpenCouncil={vi.fn()}
        goal={fixtureGoal}
        candidate={fixturePublicCandidate}
        walletStatus="other"
        onContinue={onContinue}
        onRefresh={onRefresh}
        onRetryReview={vi.fn()}
      />,
    );

    expect(screen.getByText("Full verdicts")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Strategist" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Risk Auditor" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Consumer Advocate" })).toBeVisible();
    expect(screen.getByText("Next safe step")).toBeVisible();

    await user.click(screen.getByRole("button", { name: /connect wallet to continue/i }));
    expect(onContinue).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: /refresh live options/i }));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("keeps disputed and blocked plans behind safe-stop actions", () => {
    const { rerender } = render(
      <CouncilRail
        stage="plan_disputed"
        councilProgress={null}
        reviewStartedAt={null}
        decision={fixtureDisputedDecision}
        planStale={false}
        onOpenCouncil={vi.fn()}
        goal={fixtureGoal}
        candidate={fixturePublicCandidate}
        onContinue={vi.fn()}
        onRefresh={vi.fn()}
        onRetryReview={vi.fn()}
      />,
    );

    expect(screen.getByText("The deadline gap needs clearer disclosure.")).toBeVisible();
    expect(screen.getByRole("button", { name: /ask the council to re-review/i })).toBeVisible();
    expect(screen.getByRole("button", { name: "Plan cannot continue" })).toBeDisabled();

    rerender(
      <CouncilRail
        stage="plan_blocked"
        councilProgress={null}
        reviewStartedAt={null}
        decision={fixtureBlockedDecision}
        planStale={false}
        onOpenCouncil={vi.fn()}
        goal={fixtureGoal}
        candidate={fixturePublicCandidate}
        onContinue={vi.fn()}
        onRefresh={vi.fn()}
        onRetryReview={vi.fn()}
      />,
    );
    expect(screen.getByText("The candidate violates a hard user constraint.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Plan cannot continue" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /re-review/i })).not.toBeInTheDocument();
  });
});
