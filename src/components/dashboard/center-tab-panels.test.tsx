import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { fixtureDecision, fixtureGoal, fixturePublicCandidate } from "@/test/fixtures/goalguard";
import { AuditTabPanel, CandidateReviewPanel, InlineWorkflowError, ScenarioTabPanel } from "./center-tab-panels";

describe("center tab panels", () => {
  it("moves scenario comparison into its dedicated view", () => {
    render(<ScenarioTabPanel goal={fixtureGoal} candidate={fixturePublicCandidate} onOpenPlan={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "What the protection changes" })).toBeVisible();
    expect(screen.getByText("Estimated net value after cost")).toBeVisible();
    expect(screen.getAllByText("$1,140.00")[0]).toBeVisible();
    expect(screen.getByText("Cash settlement")).toBeVisible();
  });

  it("keeps the selected candidate visible while council checks run", () => {
    render(<CandidateReviewPanel goal={fixtureGoal} candidate={fixturePublicCandidate} />);

    expect(screen.getByRole("heading", { name: /checking this live option for rent/i })).toBeVisible();
    expect(screen.getByText("Council review in progress")).toBeVisible();
    expect(screen.getByText("No action is needed yet")).toBeVisible();
  });

  it("shows the saved council records in the audit view", () => {
    render(<AuditTabPanel goal={fixtureGoal} candidate={fixturePublicCandidate} decision={fixtureDecision} trade={null} stale={false} onOpenPlan={vi.fn()} />);

    expect(screen.getByRole("heading", { name: /why this plan has this status/i })).toBeVisible();
    expect(screen.getByText("Approved by 3 of 3 checks")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Strategist" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Risk Auditor" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Consumer Advocate" })).toBeVisible();
    expect(screen.getByText("gonka-request-1")).toBeVisible();
  });

  it("explains that audit data comes after council review", () => {
    const onOpenPlan = vi.fn();
    render(<AuditTabPanel goal={fixtureGoal} candidate={null} decision={null} trade={null} stale={false} onOpenPlan={onOpenPlan} />);

    expect(screen.getByRole("heading", { name: /council record is not ready/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /open your plan/i })).toBeVisible();
  });

  it("keeps workflow errors inline with safe recovery actions", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<InlineWorkflowError error={{ code: "PREVIEW_FAILED", message: "The preview failed safely.", retryable: true, requestId: "request-1", fieldErrors: {}, details: null, returnStage: "plan_approved" }} onRetry={vi.fn()} onEdit={onEdit} />);

    expect(screen.getByRole("alert")).toHaveTextContent("The preview failed safely.");
    await user.click(screen.getByRole("button", { name: /edit goal constraints/i }));
    expect(onEdit).toHaveBeenCalledOnce();
  });
});
