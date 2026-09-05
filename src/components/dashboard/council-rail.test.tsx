import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { fixtureBlockedDecision, fixtureDecision, fixtureDisputedDecision, fixtureGoal, fixturePublicCandidate } from "@/test/fixtures/goalguard";
import { CouncilRail } from "./council-rail";

describe("CouncilRail", () => {
  it("summarises each verdict and hoists the approved plan action", async () => {
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

    expect(screen.getByText("Strategist")).toBeVisible();
    expect(screen.getByText("Risk Auditor")).toBeVisible();
    expect(screen.getByText("Consumer Advocate")).toBeVisible();
    expect(screen.getAllByText("Approve")).toHaveLength(3);
    expect(screen.getByText("Next safe step")).toBeVisible();

    // The Audit tab prints the reviews in full and sits beside this rail, so the rail must stay a
    // summary -- repeating each review's prose here put the same paragraphs on screen twice.
    expect(screen.queryByText(fixtureDecision.reviews[0]!.summary)).not.toBeInTheDocument();
    expect(screen.queryByText("Full verdicts")).not.toBeInTheDocument();

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

    // A summary rail still has to say why, or "disputed" is a label with no answer behind it.
    expect(screen.getByText("The deadline gap needs clearer disclosure.")).toBeVisible();
    expect(screen.getAllByText("Uncertain")).toHaveLength(2);
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
    expect(screen.getByText("Reject")).toBeVisible();
    expect(screen.getByRole("button", { name: "Plan cannot continue" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /re-review/i })).not.toBeInTheDocument();
  });
});
