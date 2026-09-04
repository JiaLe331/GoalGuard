import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  fixtureBlockedDecision,
  fixtureDecision,
  fixtureDisputedDecision,
  fixtureGoal,
  fixturePublicCandidate,
  previewTradeResponse,
} from "@/test/fixtures/goalguard";
import { uiPreviewStates } from "@/lib/frontend/ui-preview";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { UiPreviewLab, type UiPreviewSamples } from "./ui-preview-lab";

const samples: UiPreviewSamples = {
  goal: fixtureGoal,
  candidate: fixturePublicCandidate,
  decision: fixtureDecision,
  disputedDecision: fixtureDisputedDecision,
  blockedDecision: fixtureBlockedDecision,
  preview: previewTradeResponse.data,
  meta: previewTradeResponse.meta,
};

function renderLab(initialState: Parameters<typeof UiPreviewLab>[0]["initialState"]) {
  return render(<ThemeProvider><UiPreviewLab initialState={initialState} samples={samples} /></ThemeProvider>);
}

describe("UiPreviewLab", () => {
  it("discloses sample mode and exposes every state through a labelled control", () => {
    renderLab("goal-confirmation");
    expect(screen.getByText("Development UI preview: sample data")).toBeVisible();
    const selector = screen.getByLabelText("Interface state");
    expect(selector).toBeVisible();
    expect(within(selector).getAllByRole("option")).toHaveLength(uiPreviewStates.length);
  });

  it("switches production panels locally without network or storage traffic", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    renderLab("goal-confirmation");

    const selector = screen.getByLabelText("Interface state");
    for (const item of uiPreviewStates) {
      await user.selectOptions(selector, item.value);
      expect(selector).toHaveValue(item.value);
    }

    const fetchCalls = fetchSpy.mock.calls.length;
    const storageCalls = storageSpy.mock.calls.length;
    fetchSpy.mockRestore();
    storageSpy.mockRestore();
    expect(fetchCalls).toBe(0);
    expect(storageCalls).toBe(0);
    expect(screen.queryByRole("button", { name: /^(sign|send transaction|broadcast|approve exact amount)/i })).not.toBeInTheDocument();
  });

  it("requires the real acknowledgment control before traversing preview generation", async () => {
    const user = userEvent.setup();
    renderLab("preview-confirmation");
    const generate = screen.getByRole("button", { name: "Generate unsigned preview" });
    expect(generate).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: /I understand the exact cost/i }));
    expect(generate).toBeEnabled();
    await user.click(generate);
    expect(screen.getByLabelText("Interface state")).toHaveValue("generating-preview");
    expect(screen.getByRole("heading", { name: "Generating unsigned preview" })).toBeVisible();
  });
});
