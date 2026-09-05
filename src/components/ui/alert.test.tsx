import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Alert } from "./alert";

describe("Alert", () => {
  it("keeps its tone styling when the caller also positions it", () => {
    // Regression: `className` used to arrive via the props spread, which replaced the whole
    // attribute. Every alert that positioned itself -- 20 of them -- rendered with no tone
    // colour, no border and no padding, which is how a warning silently became plain text.
    render(<Alert className="mt-5" tone="warning" title="Council result">Physical settlement needs review.</Alert>);

    const alert = screen.getByRole("status");
    expect(alert).toHaveClass("mt-5");
    expect(alert.className).toContain("var(--warning-surface)");
    expect(alert).toHaveClass("border", "p-4");
  });

  it("marks an error tone as an assertive alert", () => {
    render(<Alert tone="error" title="Market unavailable">The snapshot could not be read.</Alert>);

    expect(screen.getByRole("alert")).toBeVisible();
  });

  it("tightens padding and type in compact mode without dropping the tone", () => {
    render(<Alert compact tone="error" title="Market unavailable">The snapshot could not be read.</Alert>);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("p-3", "text-xs");
    expect(alert).not.toHaveClass("p-4");
    expect(alert.className).toContain("var(--negative-surface)");
  });
});
