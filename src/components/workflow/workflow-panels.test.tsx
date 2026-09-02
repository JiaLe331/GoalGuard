import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { fixtureDecision, fixtureGoal, previewTradeResponse } from "@/test/fixtures/goalguard";
import { CouncilDrawer, DemoPreviewReadyPanel, GoalConfirmationForm, PreviewConfirmationPanel } from "./workflow-panels";

describe("workflow panels", () => {
  it("exposes every council role and Gonka request ID", () => {
    render(<CouncilDrawer decision={fixtureDecision} open onClose={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Strategist" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Risk Auditor" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Consumer Advocate" })).toBeInTheDocument();
    expect(screen.getByText(/gonka-request-1/i)).toBeInTheDocument();
  });

  it("requires acknowledgment before generating the unsigned preview", async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    const onAcknowledged = vi.fn();
    const { rerender } = render(<PreviewConfirmationPanel goal={fixtureGoal} candidate={previewTradeResponse.data.candidate} walletAddress="0x1111111111111111111111111111111111111111" acknowledged={false} busy={false} onAcknowledged={onAcknowledged} onBack={vi.fn()} onGenerate={onGenerate} />);
    expect(screen.getByRole("button", { name: /generate unsigned preview/i })).toBeDisabled();
    await user.click(screen.getByRole("checkbox"));
    expect(onAcknowledged).toHaveBeenCalledWith(true);
    rerender(<PreviewConfirmationPanel goal={fixtureGoal} candidate={previewTradeResponse.data.candidate} walletAddress="0x1111111111111111111111111111111111111111" acknowledged busy={false} onAcknowledged={onAcknowledged} onBack={vi.fn()} onGenerate={onGenerate} />);
    await user.click(screen.getByRole("button", { name: /generate unsigned preview/i }));
    expect(onGenerate).toHaveBeenCalledOnce();
  });

  it("renders demo-ready audit data and no signing action", () => {
    render(<DemoPreviewReadyPanel goal={fixtureGoal} preview={previewTradeResponse.data} meta={previewTradeResponse.meta} decision={fixtureDecision} onStartAnother={vi.fn()} onFreshPreview={vi.fn()} />);
    expect(screen.getByRole("heading", { name: /protection plan ready/i })).toBeVisible();
    expect(screen.getByText("No funds moved; no protected position was created")).toBeVisible();
    expect(screen.getByText(previewTradeResponse.meta.requestId)).toBeVisible();
    expect(screen.queryByRole("button", { name: /sign|approve exact amount|send transaction/i })).not.toBeInTheDocument();
  });

  it("keeps invalid confirmation fields client-side", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<GoalConfirmationForm goal={fixtureGoal} busy={false} fieldErrors={{}} onSave={onSave} onFind={vi.fn()} />);
    const amount = screen.getByLabelText(/amount you need to preserve/i);
    await user.clear(amount);
    await user.type(amount, "0");
    await user.click(screen.getByRole("button", { name: /save changes/i }));
    expect(screen.getAllByText(/amount greater than zero/i)).toHaveLength(2);
    expect(onSave).not.toHaveBeenCalled();
  });
});
