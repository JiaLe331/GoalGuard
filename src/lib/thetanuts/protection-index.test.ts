import { describe, expect, it } from "vitest";

import { deriveProtectionIndex } from "./protection-index";

const baseEntry = {
  protocolOrderId: "order-a",
  strikeUsd: "2800",
  premiumUsd: "21",
  estimatedFloorUsd: "2500",
  goalCoverageBps: 10000,
  settlementType: "cash" as const,
  availableQuantityBaseUnits: "1000000",
  settlementTokenSymbol: "USDC",
  settlementTokenDecimals: 6,
};

describe("protection index", () => {
  it("normalizes cost for covered value and term, then takes medians", () => {
    const result = deriveProtectionIndex({
      marketAsOf: "2026-09-01T00:00:00.000Z",
      protectedValueUsd: "1000",
      chain: [
        { ...baseEntry, expiry: "2026-10-01T00:00:00.000Z", impliedVolatilityBps: 6500 },
        { ...baseEntry, protocolOrderId: "order-b", premiumUsd: "42", expiry: "2026-10-31T00:00:00.000Z", impliedVolatilityBps: 7500 },
        { ...baseEntry, protocolOrderId: "order-c", premiumUsd: "10.5", expiry: "2026-10-01T00:00:00.000Z", goalCoverageBps: 5000, impliedVolatilityBps: null },
      ],
    });

    // Each row normalizes to $2.10 per $100 for 30 days.
    expect(result).toEqual({ costPer100Usd30d: "2.1", medianIvBps: 7000, sampleSize: 3 });
  });

  it("ignores malformed or expired rows and returns null without usable quotes", () => {
    const result = deriveProtectionIndex({
      marketAsOf: "2026-09-01T00:00:00.000Z",
      protectedValueUsd: "1000",
      chain: [
        { ...baseEntry, expiry: "2026-08-31T00:00:00.000Z", impliedVolatilityBps: 6500 },
        { ...baseEntry, protocolOrderId: "order-b", expiry: "not-a-date", impliedVolatilityBps: 7000 },
        { ...baseEntry, protocolOrderId: "order-c", expiry: "2026-10-01T00:00:00.000Z", premiumUsd: "0", impliedVolatilityBps: 7500 },
      ],
    });

    expect(result).toEqual({ costPer100Usd30d: null, medianIvBps: null, sampleSize: 0 });
  });

  it("returns empty metrics for an invalid protected value or timestamp", () => {
    expect(deriveProtectionIndex({ chain: [], protectedValueUsd: "0", marketAsOf: "2026-09-01T00:00:00.000Z" })).toEqual({ costPer100Usd30d: null, medianIvBps: null, sampleSize: 0 });
    expect(deriveProtectionIndex({ chain: [], protectedValueUsd: "1000", marketAsOf: "not-a-date" })).toEqual({ costPer100Usd30d: null, medianIvBps: null, sampleSize: 0 });
  });
});
