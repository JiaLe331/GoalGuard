import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { fixtureBlockedDecision, fixtureDecision, fixtureGoal, fixturePublicCandidate, fixturePublicPhysicalCandidate, fixtureTrade, previewTradeResponse } from "@/test/fixtures/goalguard";
import { ActiveProtectionPanel, CouncilDrawer, DemoPreviewReadyPanel, GoalConfirmationForm, PreviewConfirmationPanel, ProtectionPlanPanel, ReadOnlyTradePanel, WorkflowErrorPanel } from "./workflow-panels";

describe("workflow panels", () => {
  it("exposes every council role and Gonka request ID", () => {
    const { container } = render(<CouncilDrawer decision={fixtureDecision} open onClose={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Strategist" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Risk Auditor" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Consumer Advocate" })).toBeInTheDocument();
    expect(screen.getByText(/gonka-request-1/i)).toBeInTheDocument();
    expect(container.querySelectorAll('[data-pip-pose="explaining"]')).toHaveLength(1);
  });

  it("maps active backend stages to distinct Pip poses", () => {
    const { container, rerender } = render(<ActiveProtectionPanel stage="searching_candidates" />);
    expect(container.querySelector('[data-pip-pose="checking"][data-pip-active="true"]')).toBeInTheDocument();
    rerender(<ActiveProtectionPanel stage="reviewing_candidate" />);
    expect(container.querySelector('[data-pip-pose="explaining"]')).toBeInTheDocument();
    rerender(<ActiveProtectionPanel stage="generating_preview" />);
    expect(container.querySelector('[data-pip-pose="attentive"]')).toBeInTheDocument();
  });

  it("keeps expressive Pip in its original colours on dark workflow surfaces", () => {
    const { container, rerender } = render(<ActiveProtectionPanel stage="searching_candidates" />);
    expect(container.querySelector('[data-pip-pose="checking"]')).toHaveAttribute("data-pip-surface", "light");
    rerender(<DemoPreviewReadyPanel goal={fixtureGoal} preview={previewTradeResponse.data} meta={previewTradeResponse.meta} decision={fixtureDecision} onStartAnother={vi.fn()} onFreshPreview={vi.fn()} />);
    expect(container.querySelector('[data-pip-pose="ready"]')).toHaveAttribute("data-pip-surface", "light");
    expect(container.querySelector('[data-pip-pose="ready"]')).toHaveAttribute("data-pip-artwork", "full");
  });

  it("keeps approved and read-only financial surfaces mascot-free", () => {
    const callbacks = { onContinue: vi.fn(), onRefresh: vi.fn(), onOpenCouncil: vi.fn() };
    const { container, rerender } = render(<ProtectionPlanPanel goal={fixtureGoal} candidate={fixturePublicCandidate} alternatives={[]} decision={fixtureDecision} busy={false} walletStatus="other" {...callbacks} />);
    expect(container.querySelector("[data-pip-pose]")).not.toBeInTheDocument();
    rerender(<ReadOnlyTradePanel goal={fixtureGoal} trade={fixtureTrade} onStartAnother={vi.fn()} />);
    expect(container.querySelector("[data-pip-pose]")).not.toBeInTheDocument();
  });

  it("uses safe-stop Pip for blocked plans and workflow errors", () => {
    const callbacks = { onContinue: vi.fn(), onRefresh: vi.fn(), onOpenCouncil: vi.fn() };
    const { container, rerender } = render(<ProtectionPlanPanel goal={fixtureGoal} candidate={fixturePublicCandidate} alternatives={[]} decision={fixtureBlockedDecision} busy={false} walletStatus="other" {...callbacks} />);
    expect(container.querySelectorAll('[data-pip-pose="safe-stop"]')).toHaveLength(1);
    rerender(<WorkflowErrorPanel error={{ code: "NO_SUITABLE_CANDIDATE", message: "No candidate matched.", retryable: true, fieldErrors: {}, details: null, requestId: null, returnStage: "confirming_goal" }} onRetry={vi.fn()} onEdit={vi.fn()} />);
    expect(container.querySelectorAll('[data-pip-pose="safe-stop"]')).toHaveLength(1);
  });

  it("gives the council drawer mascot precedence over an underlying blocked plan", () => {
    const callbacks = { onContinue: vi.fn(), onRefresh: vi.fn(), onOpenCouncil: vi.fn() };
    const { container } = render(<><ProtectionPlanPanel goal={fixtureGoal} candidate={fixturePublicCandidate} alternatives={[]} decision={fixtureBlockedDecision} busy={false} walletStatus="other" suppressMascot {...callbacks} /><CouncilDrawer decision={fixtureBlockedDecision} open onClose={vi.fn()} /></>);
    expect(container.querySelectorAll("[data-pip-pose]")).toHaveLength(1);
    expect(container.querySelector('[data-pip-pose="explaining"]')).toBeInTheDocument();
    expect(container.querySelector('[data-pip-pose="safe-stop"]')).not.toBeInTheDocument();
  });

  it("requires acknowledgment before generating the unsigned preview", async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    const onAcknowledged = vi.fn();
    const { rerender } = render(<PreviewConfirmationPanel goal={fixtureGoal} candidate={previewTradeResponse.data.candidate} walletAddress="0x1111111111111111111111111111111111111111" acknowledged={false} physicalSettlementAcknowledged={false} busy={false} onAcknowledged={onAcknowledged} onPhysicalSettlementAcknowledged={vi.fn()} onBack={vi.fn()} onGenerate={onGenerate} />);
    expect(screen.getByRole("button", { name: /generate unsigned preview/i })).toBeDisabled();
    await user.click(screen.getByRole("checkbox"));
    expect(onAcknowledged).toHaveBeenCalledWith(true);
    rerender(<PreviewConfirmationPanel goal={fixtureGoal} candidate={previewTradeResponse.data.candidate} walletAddress="0x1111111111111111111111111111111111111111" acknowledged physicalSettlementAcknowledged={false} busy={false} onAcknowledged={onAcknowledged} onPhysicalSettlementAcknowledged={vi.fn()} onBack={vi.fn()} onGenerate={onGenerate} />);
    await user.click(screen.getByRole("button", { name: /generate unsigned preview/i }));
    expect(onGenerate).toHaveBeenCalledOnce();
  });

  it("does not show a physical-settlement checkbox for a cash-settled candidate", () => {
    render(<PreviewConfirmationPanel goal={fixtureGoal} candidate={previewTradeResponse.data.candidate} walletAddress="0x1111111111111111111111111111111111111111" acknowledged physicalSettlementAcknowledged={false} busy={false} onAcknowledged={vi.fn()} onPhysicalSettlementAcknowledged={vi.fn()} onBack={vi.fn()} onGenerate={vi.fn()} />);
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /generate unsigned preview/i })).toBeEnabled();
  });

  it("requires a second, physical-settlement-specific acknowledgment before generating a physical-settlement preview", async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    const onPhysicalSettlementAcknowledged = vi.fn();
    const { rerender } = render(<PreviewConfirmationPanel goal={fixtureGoal} candidate={fixturePublicPhysicalCandidate} walletAddress="0x1111111111111111111111111111111111111111" acknowledged physicalSettlementAcknowledged={false} busy={false} onAcknowledged={vi.fn()} onPhysicalSettlementAcknowledged={onPhysicalSettlementAcknowledged} onBack={vi.fn()} onGenerate={onGenerate} />);
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /generate unsigned preview/i })).toBeDisabled();
    expect(screen.getByText(/asset delivery, not a cash payout/i)).toBeVisible();
    rerender(<PreviewConfirmationPanel goal={fixtureGoal} candidate={fixturePublicPhysicalCandidate} walletAddress="0x1111111111111111111111111111111111111111" acknowledged physicalSettlementAcknowledged busy={false} onAcknowledged={vi.fn()} onPhysicalSettlementAcknowledged={onPhysicalSettlementAcknowledged} onBack={vi.fn()} onGenerate={onGenerate} />);
    await user.click(screen.getByRole("button", { name: /generate unsigned preview/i }));
    expect(onGenerate).toHaveBeenCalledOnce();
  });

  it("labels cash and physical protection plans distinctly", () => {
    const callbacks = { onContinue: vi.fn(), onRefresh: vi.fn(), onOpenCouncil: vi.fn() };
    const { rerender } = render(<ProtectionPlanPanel goal={fixtureGoal} candidate={fixturePublicCandidate} alternatives={[]} decision={fixtureDecision} busy={false} walletStatus="other" {...callbacks} />);
    expect(screen.getByText("Cash Protection")).toBeVisible();
    expect(screen.queryByText("Asset-Delivery Protection")).not.toBeInTheDocument();
    rerender(<ProtectionPlanPanel goal={fixtureGoal} candidate={fixturePublicPhysicalCandidate} alternatives={[]} decision={fixtureDecision} busy={false} walletStatus="other" {...callbacks} />);
    expect(screen.getByText("Asset-Delivery Protection")).toBeVisible();
    expect(screen.queryByText("Cash Protection")).not.toBeInTheDocument();
  });

  it("renders wallet-readiness balances using the candidate's actual settlement-token decimals, not a USDC-or-18 guess", () => {
    // aBasUSDC has 6 decimals like USDC, but a naive "USDC ? 6 : 18" check would misread it as
    // 18 decimals and shrink the displayed amount by a factor of 10^12.
    const physicalPreview = {
      ...previewTradeResponse.data,
      candidate: fixturePublicPhysicalCandidate,
      walletReadiness: {
        ...previewTradeResponse.data.walletReadiness,
        settlementToken: { symbol: "aBasUSDC", balanceBaseUnits: "2500000", requiredBaseUnits: "2500000", sufficient: true },
      },
    };
    render(<DemoPreviewReadyPanel goal={fixtureGoal} preview={physicalPreview} meta={previewTradeResponse.meta} decision={fixtureDecision} onStartAnother={vi.fn()} onFreshPreview={vi.fn()} />);
    expect(screen.getByText(/balance 2\.5 aBasUSDC/i)).toBeVisible();
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
