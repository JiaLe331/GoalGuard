import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fixtureMeta } from "@/test/fixtures/goalguard";
import { ProtectionMarketPanel } from "./protection-market-panel";

const chainEntry = {
  protocolOrderId: "0xabc",
  strikeUsd: "2200",
  expiry: "2026-10-30T08:00:00.000Z",
  premiumUsd: "0.42",
  estimatedFloorUsd: "88.5",
  impliedVolatilityBps: 5100,
  goalCoverageBps: 10000,
  settlementType: "cash" as const,
  availableQuantityBaseUnits: "5000000",
  settlementTokenSymbol: "aBasUSDC",
  settlementTokenDecimals: 6,
};

function snapshot(capturedAt: string, cost: string, chain: unknown = [chainEntry]) {
  return { capturedAt, ethSpotUsd: "2456.42", optionCount: 52, medianIvBps: 5159, costPer100Usd30d: cost, chain };
}

function marketResponse(body: { snapshot: unknown; series: unknown[] }) {
  return new Response(JSON.stringify({ data: body, meta: fixtureMeta }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("ProtectionMarketPanel", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows the live market before any goal exists, and names Thetanuts as its source", async () => {
    const older = snapshot("2026-09-05T07:53:00.000Z", "0.80");
    const latest = snapshot("2026-09-05T15:19:00.000Z", "0.78");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(marketResponse({ snapshot: latest, series: [older, latest] }));

    render(<ProtectionMarketPanel />);

    expect(await screen.findByText("$0.78")).toBeVisible();
    expect(screen.getByText(/Live protection market · Thetanuts on Base/i)).toBeVisible();
    expect(screen.getByText("51.59%")).toBeVisible();
    expect(screen.getByText("$2,456.42")).toBeVisible();
    // The headline count is open orders; "fillable" is the subset that actually fills at $100.
    expect(screen.getByText("52")).toBeVisible();
    expect(screen.getByText("1")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Protection chain" })).toBeVisible();
  });

  it("reports the direction of travel against the oldest reading", async () => {
    const older = snapshot("2026-09-05T07:53:00.000Z", "0.80");
    const latest = snapshot("2026-09-05T15:19:00.000Z", "0.78");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(marketResponse({ snapshot: latest, series: [older, latest] }));

    render(<ProtectionMarketPanel />);

    // 0.80 -> 0.78 is a 2.5% fall; the note must not round it away or flip its sign.
    expect(await screen.findByText("-2.5%")).toBeVisible();
  });

  it("says the worker has captured nothing rather than inventing a market", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(marketResponse({ snapshot: null, series: [] }));

    render(<ProtectionMarketPanel />);

    expect(await screen.findByText(/No market snapshot captured yet/i)).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Protection chain" })).not.toBeInTheDocument();
  });

  it("keeps the headline when a snapshot predates the stored chain", async () => {
    const legacy = snapshot("2026-09-05T15:19:00.000Z", "0.78", null);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(marketResponse({ snapshot: legacy, series: [legacy] }));

    render(<ProtectionMarketPanel />);

    expect(await screen.findByText("$0.78")).toBeVisible();
    expect(screen.getByText(/Chain detail arrives with the next snapshot/i)).toBeVisible();
  });
});
