import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it } from "vitest";

import { ThemeProvider } from "@/components/theme/theme-provider";

import { FloatingEditorialNavbar } from "./floating-editorial-navbar";

function renderNavbar(props: ComponentProps<typeof FloatingEditorialNavbar> = {}) {
  return render(<ThemeProvider><FloatingEditorialNavbar walletSlot={<button type="button">Test wallet</button>} {...props} /></ThemeProvider>);
}

describe("FloatingEditorialNavbar", () => {
  it("exposes the approved information architecture", () => {
    renderNavbar();
    const navigation = screen.getByRole("navigation", { name: "Primary navigation" });
    expect(navigation).toBeInTheDocument();
    expect(navigation.closest("header")).toHaveClass("sticky", "top-0", "w-full");
    expect(navigation).toHaveClass("rounded-full");
    expect(screen.getAllByRole("link", { name: "How it works" }).at(0)).toHaveAttribute("href", "#how-it-works");
    expect(screen.getAllByRole("link", { name: "Trust & safety" }).at(0)).toHaveAttribute("href", "#trust-safety");
    expect(screen.getAllByRole("link", { name: "Live foundations" }).at(0)).toHaveAttribute("href", "#live-foundations");
    expect(screen.getAllByRole("link", { name: "Open workspace" }).at(0)).toHaveAttribute("href", "/dashboard");
  });

  it("opens an accessible sheet, closes on Escape, and restores focus", async () => {
    const user = userEvent.setup();
    renderNavbar();
    const menu = screen.getByRole("button", { name: /menu/i });
    await user.click(menu);
    await waitFor(() => expect(screen.getByRole("dialog", { name: "Explore GoalGuard" })).toBeVisible());
    expect(screen.getByRole("button", { name: "Close panel" })).toBeVisible();
    expect(document.body.style.overflow).toBe("hidden");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Explore GoalGuard" })).not.toBeInTheDocument());
    expect(menu).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("adapts the pill shell for the workflow without marketing links", () => {
    renderNavbar({ variant: "workflow", contextLabel: "Council review · Review your protection plan" });
    expect(screen.getByRole("navigation", { name: "Goal workflow navigation" })).toHaveClass("rounded-full");
    expect(screen.getByText(/council review/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "How it works" })).not.toBeInTheDocument();
  });

  it("puts workflow navigation content in an accessible phone drawer", async () => {
    const user = userEvent.setup();
    renderNavbar({
      variant: "workflow",
      contextLabel: "Council review · Review your protection plan",
      mobileDrawerContent: <p>Your active goal and services</p>,
    });
    const menu = screen.getByRole("button", { name: /menu/i });
    expect(menu).toHaveAttribute("aria-controls", "workflow-navigation-menu");
    await user.click(menu);
    const drawer = screen.getByRole("dialog", { name: "Goal workspace menu" });
    await waitFor(() => expect(drawer).toBeVisible());
    expect(drawer).toHaveTextContent("Your active goal and services");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Goal workspace menu" })).not.toBeInTheDocument());
    expect(menu).toHaveFocus();
  });
});
