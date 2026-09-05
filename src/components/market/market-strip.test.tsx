import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fixtureMeta } from "@/test/fixtures/goalguard";
import { MarketStrip } from "./market-strip";

const snapshot = {
  capturedAt: fixtureMeta.timestamp,
  ethSpotUsd: "3000",
  optionCount: 58,
  medianIvBps: 6500,
  costPer100Usd30d: "2.1",
  chain: null,
};

function marketResponse(value: typeof snapshot | null) {
  return new Response(JSON.stringify({ data: { snapshot: value, series: value ? [value] : [] }, meta: fixtureMeta }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("MarketStrip", () => {
  afterEach(() => vi.restoreAllMocks());

  it("renders the latest worker snapshot with honest observed metrics", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(marketResponse(snapshot));
    render(<MarketStrip />);

    expect(await screen.findByText("$2.10")).toBeVisible();
    expect(screen.getByText("65%")).toBeVisible();
    expect(screen.getByText("$3,000.00")).toBeVisible();
    expect(screen.getByText("58")).toBeVisible();
    expect(screen.getByText(/Observed .* UTC/)).toBeVisible();
    expect(screen.getByText("Worker")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith("/api/market/summary", expect.objectContaining({ credentials: "same-origin" }));
  });

  it("explains why the strip is empty before the worker captures its first snapshot", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(marketResponse(null));
    render(<MarketStrip />);

    expect(await screen.findByRole("status")).toHaveTextContent(/background worker has not captured a market snapshot/i);
  });
});
