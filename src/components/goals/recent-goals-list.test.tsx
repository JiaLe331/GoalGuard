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
});
