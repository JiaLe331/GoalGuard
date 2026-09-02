import { describe, expect, it } from "vitest";

import { parseThetanutsMarketData, parseThetanutsOrders } from "./client";

describe("Thetanuts SDK boundary", () => {
  it("rejects malformed SDK data before it reaches strategy code", () => {
    expect(() => parseThetanutsOrders({ orders: [] })).toThrow("malformed order data");
    expect(() => parseThetanutsMarketData({ prices: { ETH: "not-a-number" }, metadata: { lastUpdated: Date.now() } })).toThrow();
  });

  it("parses live-shaped market data", () => {
    expect(parseThetanutsMarketData({
      prices: { ETH: 3_100.25, BTC: 100_000 },
      metadata: { lastUpdated: 1_788_000_000_000, currentTime: 1_788_000_000_001 },
    })).toMatchObject({ prices: { ETH: 3_100.25 }, metadata: { lastUpdated: 1_788_000_000_000 } });
  });
});
