import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ScenarioComparison } from "@/components/workflow/workflow-primitives";
import { fixturePublicCandidate } from "@/test/fixtures/goalguard";

describe("ScenarioComparison", () => {
  it("uses directly labelled accessible rows without a hidden table", () => {
    const { container } = render(<ScenarioComparison scenarios={fixturePublicCandidate.scenarios} />);
    expect(screen.getByRole("list", { name: /estimated value after protection/i })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(fixturePublicCandidate.scenarios.length);
    expect(screen.getByText("Market down")).toBeVisible();
    expect(container.querySelector("table")).not.toBeInTheDocument();
  });
});
