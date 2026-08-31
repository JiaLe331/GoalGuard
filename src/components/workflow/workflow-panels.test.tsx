import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { fixtureDecision, fixtureGoal, previewTradeResponse } from "@/test/fixtures/goalguard";
import { CouncilDrawer, GoalConfirmationForm, TradePreviewPanel } from "./workflow-panels";

describe("workflow panels", () => {
  it("exposes every council role and Gonka request ID", () => {
    render(<CouncilDrawer decision={fixtureDecision} open onClose={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Strategist" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Risk Auditor" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Consumer Advocate" })).toBeVisible();
    expect(screen.getByText(/gonka-request-1/i)).toBeVisible();
  });

  it("never renders a signing CTA when execution is disabled", async () => {
    const user = userEvent.setup();
    render(<TradePreviewPanel preview={previewTradeResponse.data} walletAddress="0x1111111111111111111111111111111111111111" executionEnabled={false} maxPremiumUsd="3" busy={false} onBack={vi.fn()} onConfirm={vi.fn()} />);
    await user.click(screen.getByRole("checkbox"));
    expect(screen.getByText("Preview only", { exact: true })).toBeVisible();
    expect(screen.queryByRole("button", { name: /prepare wallet transaction/i })).not.toBeInTheDocument();
  });

  it("keeps invalid confirmation fields client-side", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<GoalConfirmationForm goal={fixtureGoal} busy={false} fieldErrors={{}} onSave={onSave} onFind={vi.fn()} />);
    const amount = screen.getByLabelText(/amount you need to preserve/i);
    await user.clear(amount);
    await user.type(amount, "0");
    await user.click(screen.getByRole("button", { name: /save changes/i }));
    expect(screen.getByText(/amount greater than zero/i)).toBeVisible();
    expect(onSave).not.toHaveBeenCalled();
  });
});
