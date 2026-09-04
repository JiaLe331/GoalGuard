import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ScenarioComparison } from "@/components/workflow/workflow-primitives";
import { fixturePublicCandidate, fixturePublicPhysicalCandidate } from "@/test/fixtures/goalguard";

describe("ScenarioComparison", () => {
  it("uses directly labelled accessible rows without a hidden table", () => {
    const { container } = render(<ScenarioComparison scenarios={fixturePublicCandidate.scenarios} settlementType={fixturePublicCandidate.settlementType} strikeUsd={fixturePublicCandidate.strikeUsd} />);
    expect(screen.getByRole("list", { name: /estimated value after protection/i })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(fixturePublicCandidate.scenarios.length);
    expect(screen.getByText("Market down")).toBeVisible();
    expect(container.querySelector("table")).not.toBeInTheDocument();
  });

  it("shows a cash top-up composition line for every scenario when cash-settled", () => {
    render(<ScenarioComparison scenarios={fixturePublicCandidate.scenarios} settlementType="cash" strikeUsd={fixturePublicCandidate.strikeUsd} />);
    expect(screen.getAllByText("You would hold: ETH plus a cash top-up")).toHaveLength(fixturePublicCandidate.scenarios.length);
  });

  it("distinguishes delivered-asset scenarios from unchanged-ETH scenarios when physically settled, without naming the raw token symbol", () => {
    // fixturePhysicalCandidate's strike (2800) is above the "down" scenario's settlement price
    // (2200, in-the-money) and below/at "flat"/"up" (3000, 3600, out-of-the-money).
    render(<ScenarioComparison scenarios={fixturePublicPhysicalCandidate.scenarios} settlementType="physical" strikeUsd={fixturePublicPhysicalCandidate.strikeUsd} />);
    expect(screen.getByText("You would hold: a USD-linked settlement asset instead of ETH")).toBeVisible();
    expect(screen.getAllByText("You would hold: your ETH, unchanged")).toHaveLength(2);
    expect(screen.queryByText(/aBasUSDC/i)).not.toBeInTheDocument();
  });
});
