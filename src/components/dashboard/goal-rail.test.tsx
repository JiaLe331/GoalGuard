import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fixtureGoal } from "@/test/fixtures/goalguard";
import { GoalRail, type DemoGoalSummary } from "./goal-rail";

const demoGoal: DemoGoalSummary = {
  id: "248166b9-11e5-4f01-9688-b4ea4fce459f",
  goalType: "emergency",
  customGoalLabel: null,
  protectedValueUsd: "100",
  status: "reviewing",
};

describe("GoalRail", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("offers the demo goal so a browser with no history still has something real to open", () => {
    render(<GoalRail goal={null} demoGoal={demoGoal} />);

    const link = screen.getByRole("link", { name: /Emergency fund/ });
    expect(link).toHaveAttribute("href", `/goals/${demoGoal.id}`);
    expect(screen.getByText("$100.00")).toBeVisible();
  });

  it("does not repeat the demo goal as an example while it is the goal on screen", () => {
    render(<GoalRail goal={{ ...fixtureGoal, id: demoGoal.id }} demoGoal={demoGoal} />);

    expect(screen.queryByText("Example goal")).not.toBeInTheDocument();
  });

  it("omits the example entirely when no demo goal is configured", () => {
    render(<GoalRail goal={null} demoGoal={null} />);

    expect(screen.queryByText("Example goal")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /New goal/ })).toHaveAttribute("href", "/goals/new");
  });
});
