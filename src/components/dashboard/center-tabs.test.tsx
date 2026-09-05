import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CenterTabPanel, CenterTabs } from "./center-tabs";

describe("CenterTabs", () => {
  it("renders the four views with one selected tab", () => {
    render(<CenterTabs activeTab="plan" onTabChange={vi.fn()} />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4);
    expect(screen.getByRole("tab", { name: "Plan" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Market" })).toHaveAttribute("aria-selected", "false");
  });

  it("changes views by click and supports roving keyboard focus", async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    render(<CenterTabs activeTab="plan" onTabChange={onTabChange} />);

    await user.click(screen.getByRole("tab", { name: "Market" }));
    expect(onTabChange).toHaveBeenCalledWith("market");

    const plan = screen.getByRole("tab", { name: "Plan" });
    plan.focus();
    await user.keyboard("{ArrowRight}");
    expect(onTabChange).toHaveBeenLastCalledWith("scenarios");
    expect(screen.getByRole("tab", { name: "Scenarios" })).toHaveFocus();

    await user.keyboard("{Home}");
    expect(onTabChange).toHaveBeenLastCalledWith("market");
    expect(screen.getByRole("tab", { name: "Market" })).toHaveFocus();
  });

  it("only mounts the active tab panel", () => {
    render(
      <>
        <CenterTabPanel tab="market" activeTab="plan">Market content</CenterTabPanel>
        <CenterTabPanel tab="plan" activeTab="plan">Plan content</CenterTabPanel>
      </>,
    );

    expect(screen.queryByText("Market content")).not.toBeInTheDocument();
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "workspace-tab-plan");
    expect(screen.getByText("Plan content")).toBeVisible();
  });
});
