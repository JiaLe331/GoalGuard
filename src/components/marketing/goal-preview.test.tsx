import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GoalPreview } from "./goal-preview";

describe("GoalPreview", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("presents examples without exposing fake form controls", () => {
    render(<GoalPreview />);

    expect(screen.getByRole("heading", { name: /start with what the money is for/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /build my protection plan/i })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByText(/examples include protecting rent, tuition, and emergency savings/i)).toHaveClass("sr-only");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rent" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("loops the slower sample sequence, pauses on hover, and clears its timer", () => {
    vi.useFakeTimers();
    const { unmount } = render(<GoalPreview />);

    act(() => vi.advanceTimersByTime(8_500));
    expect(document.querySelector('[data-active="true"]')).toHaveTextContent("Rent");

    fireEvent.mouseEnter(screen.getByTestId("goal-preview"));
    const pausedText = screen.getByTestId("typed-goal-example").textContent;
    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.getByTestId("typed-goal-example")).toHaveTextContent(pausedText ?? "");

    fireEvent.mouseLeave(screen.getByTestId("goal-preview"));
    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByTestId("typed-goal-example").textContent).not.toBe(pausedText);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("shows the final static example when reduced motion is requested", () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<GoalPreview />);
    expect(screen.getByTestId("typed-goal-example")).toHaveTextContent("Guard my emergency savings.");
    expect(document.querySelector('[data-active="true"]')).toHaveTextContent("Emergency");
    expect(screen.queryByRole("button", { name: /examples/i })).not.toBeInTheDocument();
  });
});
