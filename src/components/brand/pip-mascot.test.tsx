import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PipMark, PipMascot, type PipPose } from "./pip-mascot";

const poses: PipPose[] = ["neutral", "listening", "checking", "explaining", "attentive", "safe-stop", "ready"];

describe("Pip brand artwork", () => {
  it("renders every approved pose with a distinct expression or signal and no focus target", () => {
    const { container, rerender } = render(<PipMascot pose="neutral" />);
    for (const pose of poses) {
      rerender(<PipMascot pose={pose} />);
      const mascot = container.querySelector(`[data-pip-pose="${pose}"]`);
      expect(mascot).toBeInTheDocument();
      expect(mascot).toHaveAttribute("data-pip-expression");
      if (pose !== "neutral") expect(mascot?.querySelector(`[data-pip-accessory="${pose}"]`)).toBeInTheDocument();
      expect(container.querySelector("button, a, [tabindex]")).not.toBeInTheDocument();
    }
  });

  it("uses compact artwork at small size and the full silhouette from 128px", () => {
    const { container, rerender } = render(<PipMascot pose="neutral" size="sm" />);
    expect(container.querySelector('[data-pip-artwork="compact"]')).toHaveClass("h-20", "w-24");
    rerender(<PipMascot pose="neutral" size="md" />);
    expect(container.querySelector('[data-pip-artwork="full"]')).toHaveClass("h-32", "w-36");
    rerender(<PipMascot pose="neutral" size="sm" form="full" />);
    expect(container.querySelector('[data-pip-artwork="full"]')).toHaveClass("h-20", "w-24");
  });

  it("applies real surface colors and exposes active request state", () => {
    const { container, rerender } = render(<PipMascot pose="checking" surface="light" />);
    expect(container.querySelector('[data-pip-surface="light"]')).toHaveAttribute("data-pip-active", "false");
    expect(container.querySelector('[data-pip-region="armour"]')).toHaveAttribute("fill", "var(--pip-armour)");
    rerender(<PipMascot pose="checking" surface="dark" active />);
    expect(container.querySelector('[data-pip-surface="dark"]')).toHaveAttribute("data-pip-active", "true");
    expect(container.querySelector('[data-pip-region="armour"]')).toHaveAttribute("fill", "var(--pip-armour-on-dark)");
    rerender(<PipMascot pose="neutral" surface="lime" />);
    expect(container.querySelector('[data-pip-surface="lime"]')).toBeInTheDocument();
    expect(container.querySelector("svg > circle")).toHaveAttribute("fill", "var(--pip-stage-on-lime)");
  });

  it("keeps decorative artwork silent and labels meaningful artwork", () => {
    const { rerender } = render(<PipMascot pose="neutral" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    rerender(<PipMascot pose="safe-stop" decorative={false} label="Pip indicates a safe stop" />);
    expect(screen.getByRole("img", { name: "Pip indicates a safe stop" })).toBeVisible();
  });

  it("uses the surface-aware micro-mark as non-interactive brand identity", () => {
    const { container, rerender } = render(<PipMark surface="lime" decorative={false} label="GoalGuard" />);
    expect(screen.getByRole("img", { name: "GoalGuard" })).toHaveAttribute("data-pip-mark", "true");
    expect(container.querySelector('[data-pip-region="body"]')).toHaveAttribute("fill", "var(--pip-mark-on-lime)");
    rerender(<PipMark surface="dark" decorative={false} label="GoalGuard" />);
    expect(container.querySelector('[data-pip-region="armour"]')).toHaveAttribute("fill", "var(--pip-armour-on-dark)");
    expect(container.querySelector("button, a, [tabindex]")).not.toBeInTheDocument();
  });
});
