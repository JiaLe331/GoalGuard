import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { fixtureGoal, fixturePublicCandidate, generateCandidatesResponse } from "@/test/fixtures/goalguard";
import type { MarketContext } from "@/lib/frontend/workflow";
import { MarketOverview } from "./market-overview";

const market: MarketContext = {
  chain: [
    ...generateCandidatesResponse.data.chain,
    { ...generateCandidatesResponse.data.chain[0]!, protocolOrderId: "order-two", expiry: "2099-10-01T08:00:00.000Z", strikeUsd: "2900", premiumUsd: "4", estimatedFloorUsd: "2700", impliedVolatilityBps: 7200 },
  ],
  rejected: [
    { protocolOrderId: "cost", strikeUsd: "3000", expiry: "2099-09-30T08:00:00.000Z", premiumUsd: "9", reasons: ["Full goal coverage exceeds the protection-cost limit."] },
    { protocolOrderId: "expiry", strikeUsd: null, expiry: null, premiumUsd: null, reasons: ["The option expires before the goal deadline."] },
  ],
  ethSpotUsd: "3000",
  marketAsOf: fixtureGoal.updatedAt,
};

describe("MarketOverview", () => {
  it("shows the cost index, expiry-grouped chain, rejection summary, and floor gauge", () => {
    render(<MarketOverview goal={fixtureGoal} market={market} selectedCandidate={fixturePublicCandidate} />);
    expect(screen.getByRole("heading", { name: "Cost of safety" })).toBeVisible();
    expect(screen.getByText("Fillable options")).toBeVisible();
    expect(screen.getByText("Protection chain")).toBeVisible();
    expect(screen.getAllByRole("heading", { name: /Expires.*2099/ })).toHaveLength(2);
    expect(screen.getByText(/2 quotes filtered out/i)).toBeVisible();
    expect(screen.getByRole("img", { name: /estimated floor/i })).toBeInTheDocument();
  });

  it("states when no quote can support the floor gauge", () => {
    render(<MarketOverview goal={fixtureGoal} market={{ ...market, chain: [], rejected: [] }} />);
    expect(screen.getByText(/floor gauge will appear with a fillable quote/i)).toBeVisible();
  });
});
