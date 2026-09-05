import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { RecentGoalsList } from "./recent-goals-list";
import { saveRecentGoal } from "@/lib/frontend/storage";

describe("RecentGoalsList", () => {
  beforeEach(() => window.localStorage.clear());

  it("renders nothing when this browser has no recent goals", async () => {
    const { container } = render(<RecentGoalsList />);
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(container).toBeEmptyDOMElement();
  });

  it("links to a saved recent goal by its cached label", async () => {
    saveRecentGoal({ id: "10000000-0000-4000-8000-000000000001", createdAt: "2026-08-31T12:00:00.000Z", goalType: "emergency", customGoalLabel: null, protectedValueUsd: "150" });
    render(<RecentGoalsList />);
    const link = await screen.findByRole("link", { name: /emergency fund/i });
    expect(link).toHaveAttribute("href", "/goals/10000000-0000-4000-8000-000000000001");
  });

  it("marks the active goal and exposes its last-known health cue", async () => {
    saveRecentGoal({ id: "10000000-0000-4000-8000-000000000001", createdAt: "2026-08-31T12:00:00.000Z", goalType: "emergency", customGoalLabel: null, protectedValueUsd: "150", status: "ready" });
    saveRecentGoal({ id: "10000000-0000-4000-8000-000000000002", createdAt: "2026-08-31T12:00:00.000Z", goalType: "rent", customGoalLabel: null, protectedValueUsd: "300", status: "failed" });
    render(<RecentGoalsList activeGoalId="10000000-0000-4000-8000-000000000001" activeGoalStatus="reviewing" />);

    const activeLink = await screen.findByRole("link", { name: /emergency fund/i });
    expect(activeLink).toHaveAttribute("aria-current", "page");
    expect(activeLink).toHaveAttribute("data-active", "true");
    expect(screen.getByText("Status: Council review.")).toBeInTheDocument();

    const inactiveLink = screen.getByTitle("Rent");
    expect(inactiveLink).not.toHaveAttribute("aria-current");
    expect(screen.getByText("Status: Needs attention.")).toBeInTheDocument();
  });
});
