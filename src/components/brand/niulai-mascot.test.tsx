import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NiulaiMark, NiulaiMascot, niulaiPoseSources, type NiulaiPose } from "./niulai-mascot";

const poses: NiulaiPose[] = ["neutral", "listening", "checking", "explaining", "attentive", "safe-stop", "ready"];

describe("Niu Lai brand artwork", () => {
  it("routes every approved pose to its full-resolution transparent runtime asset", () => {
    const { container, rerender } = render(<NiulaiMascot pose="neutral" />);
    for (const pose of poses) {
      rerender(<NiulaiMascot pose={pose} />);
      const mascot = container.querySelector(`[data-niulai-pose="${pose}"]`);
      expect(mascot).toHaveAttribute("data-niulai-pose-source", niulaiPoseSources[pose]);
      expect(mascot).toHaveAttribute("data-niulai-expression");
      expect(mascot).toHaveAttribute("data-niulai-model", "niulai-v1-pose-set");
      expect(mascot?.querySelector("img")).toHaveAttribute("loading", "lazy");
      expect(mascot?.querySelector("img")).toHaveAttribute("src", niulaiPoseSources[pose]);
      expect(mascot?.querySelector("img")).not.toHaveAttribute("srcset");
      expect(container.querySelector("button, a, [tabindex]")).not.toBeInTheDocument();
    }
  });

  it("uses an upper-body crop at small size and the full cutout from 128px", () => {
    const { container, rerender } = render(<NiulaiMascot pose="neutral" size="sm" />);
    expect(container.querySelector('[data-niulai-artwork="compact"]')).toHaveClass("h-20", "w-24", "overflow-hidden");
    rerender(<NiulaiMascot pose="neutral" size="md" />);
    expect(container.querySelector('[data-niulai-artwork="full"]')).toHaveClass("h-32", "w-36");
    rerender(<NiulaiMascot pose="neutral" size="sm" form="full" />);
    expect(container.querySelector('[data-niulai-artwork="full"]')).toHaveClass("h-20", "w-24");
  });

  it("exposes surface and active state without changing the canonical pose art", () => {
    const { container, rerender } = render(<NiulaiMascot pose="checking" surface="light" />);
    expect(container.querySelector('[data-niulai-surface="light"]')).toHaveAttribute("data-niulai-active", "false");
    rerender(<NiulaiMascot pose="checking" surface="dark" active />);
    expect(container.querySelector('[data-niulai-surface="dark"]')).toHaveAttribute("data-niulai-active", "true");
    rerender(<NiulaiMascot pose="neutral" surface="lime" />);
    expect(container.querySelector('[data-niulai-surface="lime"]')).toHaveAttribute("data-niulai-pose-source", niulaiPoseSources.neutral);
  });

  it("keeps decorative artwork silent and labels meaningful artwork", () => {
    const { rerender } = render(<NiulaiMascot pose="neutral" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    rerender(<NiulaiMascot pose="safe-stop" decorative={false} label="Niu Lai indicates a safe stop" />);
    expect(screen.getByRole("img", { name: "Niu Lai indicates a safe stop" })).toBeVisible();
  });

  it("uses the surface-aware cow micro-mark as non-interactive identity", () => {
    const { container, rerender } = render(<NiulaiMark surface="lime" decorative={false} label="GoalGuard" />);
    expect(screen.getByRole("img", { name: "GoalGuard" })).toHaveAttribute("data-niulai-mark", "true");
    expect(container.querySelector('[data-niulai-region="fur"]')).toHaveAttribute("fill", "var(--niulai-mark-on-lime)");
    rerender(<NiulaiMark surface="dark" decorative={false} label="GoalGuard" />);
    expect(container.querySelector('[data-niulai-region="horn"]')).toHaveAttribute("fill", "var(--niulai-horn-on-dark)");
    expect(container.querySelector("button, a, [tabindex]")).not.toBeInTheDocument();
  });
});
