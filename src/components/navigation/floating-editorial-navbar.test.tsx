import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { FloatingEditorialNavbar } from "./floating-editorial-navbar";

describe("FloatingEditorialNavbar", () => {
  it("exposes the approved information architecture", () => {
    render(<FloatingEditorialNavbar walletSlot={<button type="button">Test wallet</button>} />);
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "How it works" }).at(0)).toHaveAttribute("href", "#how-it-works");
    expect(screen.getAllByRole("link", { name: "Trust & safety" }).at(0)).toHaveAttribute("href", "#trust-safety");
    expect(screen.getAllByRole("link", { name: "Live foundations" }).at(0)).toHaveAttribute("href", "#live-foundations");
    expect(screen.getAllByRole("link", { name: "Start a goal" }).at(0)).toHaveAttribute("href", "#goal-composer");
  });

  it("opens an accessible sheet, closes on Escape, and restores focus", async () => {
    const user = userEvent.setup();
    render(<FloatingEditorialNavbar walletSlot={<button type="button">Test wallet</button>} />);
    const menu = screen.getByRole("button", { name: /menu/i });
    await user.click(menu);
    expect(screen.getByRole("dialog", { name: "Explore GoalGuard" })).toBeVisible();
    expect(document.body.style.overflow).toBe("hidden");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Explore GoalGuard" })).not.toBeInTheDocument());
    expect(menu).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });
});
