import { describe, expect, it } from "vitest";

import { fetchEthPutOrders, parseThetanutsMarketData, parseThetanutsOrders } from "./client-core";

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

  it("uses the SDK's live-response-aware order reader and filters ETH puts locally", async () => {
    const ethPriceFeed = "0x1111111111111111111111111111111111111111";
    const orders = await fetchEthPutOrders({
      api: { fetchOrders: async () => [
        { order: { nonce: 1n, expiry: 1_788_000_000n }, signature: "0xsignature", availableAmount: 1n, makerAddress: "0x2222222222222222222222222222222222222222", rawApiData: { priceFeed: ethPriceFeed, isCall: false } },
        { order: { nonce: 2n, expiry: 1_788_000_000n }, signature: "0xsignature", availableAmount: 1n, makerAddress: "0x2222222222222222222222222222222222222222", rawApiData: { priceFeed: ethPriceFeed, isCall: true } },
      ] as never },
      chainConfig: { priceFeeds: { ETH: ethPriceFeed } },
    } as never, 1_787_000_000);
    expect(orders).toHaveLength(1);
    expect(orders[0]?.order.nonce).toBe(1n);
  });
});
