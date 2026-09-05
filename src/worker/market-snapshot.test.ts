// @vitest-environment node
import type { OrderWithSignature } from "@thetanuts-finance/thetanuts-client";
import { describe, expect, it } from "vitest";

import { captureMarketSnapshot } from "./market-snapshot";

const now = new Date("2026-09-01T00:00:00.000Z");
const usdc = "0x1111111111111111111111111111111111111111";
const put = "0x2222222222222222222222222222222222222222";
const maker = "0x3333333333333333333333333333333333333333";
const feed = "0x5555555555555555555555555555555555555555";
const expiry = BigInt(Date.parse("2026-10-01T00:00:00.000Z") / 1000);

function order(nonce: bigint): OrderWithSignature {
  return {
    order: {
      maker,
      taker: "0x0000000000000000000000000000000000000000",
      option: "0x0000000000000000000000000000000000000000",
      isBuyer: false,
      numContracts: 400_000n,
      price: 750_000_000n,
      expiry,
      nonce,
      optionType: 1,
      strikes: [300_000_000_000n],
      collateralToken: usdc,
      underlyingToken: "0x4444444444444444444444444444444444444444",
    },
    signature: `0x${nonce.toString(16).padStart(130, "0")}`,
    availableAmount: 10_000_000n,
    makerAddress: maker,
    rawApiData: {
      collateral: usdc,
      priceFeed: feed,
      implementation: put,
      strikes: ["300000000000"],
      isCall: false,
      isLong: true,
      orderExpiryTimestamp: Number(now.getTime() / 1000) + 3600,
      extraOptionData: "0x",
      maxCollateralUsable: "10000000",
      greeks: { delta: -0.4, iv: 0.65, gamma: 0.01, theta: -0.1, vega: 0.2 },
    },
  };
}

function client(orders: OrderWithSignature[]) {
  return {
    api: {
      fetchOrders: async () => orders,
      getMarketData: async () => ({ prices: { ETH: 3000 }, metadata: { lastUpdated: now.getTime() } }),
    },
    chainConfig: {
      priceFeeds: { ETH: feed },
      tokens: { USDC: { address: usdc, symbol: "USDC", decimals: 6 } },
      implementations: { PUT: put },
    },
    optionBook: {
      previewFillOrder: (input: OrderWithSignature, amount: bigint) => ({
        numContracts: invalidPreviewFor(input) ? 0n : amount * 100_000_000n / 750_000_000n,
        maxContracts: 1_000_000n,
        collateralToken: input.rawApiData!.collateral,
        pricePerContract: 750_000_000n,
        totalCollateral: amount,
        referrer: "0x0000000000000000000000000000000000000000",
        maker,
        expiry,
        isCall: false,
        strikes: [300_000_000_000n],
      }),
    },
  } as never;
}

function invalidPreviewFor(input: OrderWithSignature) {
  return input.signature.endsWith("2");
}

describe("market snapshot capture", () => {
  it("captures spot, live option count, and a normalized cost/IV index", async () => {
    const snapshot = await captureMarketSnapshot(client([order(1n)]), now);
    expect(snapshot).toMatchObject({ capturedAt: now.toISOString(), ethSpotUsd: "3000", optionCount: 1, medianIvBps: 6500, costPer100Usd30d: "0.250005" });
  });

  it("keeps the live count while excluding an order that cannot be previewed", async () => {
    const snapshot = await captureMarketSnapshot(client([order(2n)]), now);
    expect(snapshot).toMatchObject({ optionCount: 1, medianIvBps: null, costPer100Usd30d: null });
  });
});
