// @vitest-environment node
import type { OrderWithSignature } from "@thetanuts-finance/thetanuts-client";
import { describe, expect, it } from "vitest";

import type { Goal } from "@/lib/contracts";
import { generateProtectionCandidates, type CandidateGenerationOptions } from "./strategy";

const now = new Date("2026-09-01T00:00:00.000Z");
const usdc = "0x1111111111111111111111111111111111111111";
const put = "0x2222222222222222222222222222222222222222";
const physicalPut = "0x2222222222222222222222222222222222222299";
const aBasUsdc = "0x1111111111111111111111111111111111111199";
const maker = "0x3333333333333333333333333333333333333333";
const expiry = BigInt(Date.parse("2026-10-01T00:00:00.000Z") / 1000);
const deadline = BigInt(Date.parse("2026-09-02T00:00:00.000Z") / 1000);

const goal: Goal = { schemaVersion: 1, id: "1b3e798c-e0e8-4ab5-9e37-d4526424eb8f", goalType: "rent", customGoalLabel: null, underlyingAsset: "ETH", protectedValueUsd: "1200", deadline: "2026-09-30", maxLossBps: 500, maxPremiumUsd: "3", originalUserMessage: "Protect rent.", status: "searching", createdAt: now.toISOString(), updatedAt: now.toISOString(), parseInferenceId: null, selectedCandidateId: null, councilDecisionId: null, tradeId: null };

// Live Thetanuts market makers reuse the same nonce across many distinct strikes/expiries, so
// each order's ECDSA signature (not maker:nonce) is what uniquely identifies it; fixtures give
// each nonce a distinct, correctly-shaped signature to mirror that.
function order(nonce: bigint, changes: Partial<OrderWithSignature["order"]> = {}, rawChanges: Partial<NonNullable<OrderWithSignature["rawApiData"]>> = {}): OrderWithSignature {
  return { order: { maker, taker: "0x0000000000000000000000000000000000000000", option: "0x0000000000000000000000000000000000000000", isBuyer: false, numContracts: 400_000n, price: 750_000_000n, expiry, nonce, optionType: 1, strikes: [300_000_000_000n], collateralToken: usdc, underlyingToken: "0x4444444444444444444444444444444444444444", deadline, ...changes }, signature: `0x${nonce.toString(16).padStart(130, "0")}`, availableAmount: 10_000_000n, makerAddress: maker, rawApiData: { collateral: usdc, priceFeed: "0x5555555555555555555555555555555555555555", implementation: put, strikes: ["300000000000"], isCall: false, isLong: true, orderExpiryTimestamp: Number(deadline), extraOptionData: "0x", maxCollateralUsable: "10000000", ...rawChanges } };
}

// A physically-settled order: different implementation contract, different (still valid, still
// consistently-signed) collateral token -- mirrors what the live market actually offers today.
function physicalOrder(nonce: bigint, changes: Partial<OrderWithSignature["order"]> = {}): OrderWithSignature {
  return order(nonce, { collateralToken: aBasUsdc, ...changes }, { implementation: physicalPut, collateral: aBasUsdc });
}

function client(orders: OrderWithSignature[], previewOverride?: (order: OrderWithSignature, amount: bigint) => { numContracts: bigint; maxContracts: bigint; collateralToken: string; pricePerContract: bigint; totalCollateral: bigint; referrer: string; maker: string; expiry: bigint; isCall: boolean; strikes: bigint[] }): CandidateGenerationOptions["client"] {
  return {
    api: { fetchOrders: async () => orders, getMarketData: async () => ({ prices: { ETH: 3000 }, metadata: { lastUpdated: now.getTime(), currentTime: now.getTime() } }) },
    chainConfig: { priceFeeds: { ETH: "0x5555555555555555555555555555555555555555" }, tokens: { USDC: { address: usdc, symbol: "USDC", decimals: 6 }, aBasUSDC: { address: aBasUsdc, symbol: "aBasUSDC", decimals: 6 } }, implementations: { PUT: put, PHYSICAL_PUT: physicalPut } },
    optionBook: { previewFillOrder: (input: OrderWithSignature, amount: bigint = 0n) => previewOverride?.(input, amount) ?? ({ numContracts: amount * 100_000_000n / 750_000_000n, maxContracts: 1_000_000n, collateralToken: input.rawApiData!.collateral, pricePerContract: 750_000_000n, totalCollateral: amount, referrer: "0x0000000000000000000000000000000000000000", maker, expiry, isCall: false, strikes: [300_000_000_000n] }) },
  } as unknown as CandidateGenerationOptions["client"];
}

describe("deterministic Thetanuts strategy", () => {
  it("creates a fully covered vanilla ETH put with exact decimal calculations", async () => {
    const result = await generateProtectionCandidates(goal, { client: client([order(1n, {}, { greeks: { delta: -0.4, iv: 0.65, gamma: 0.01, theta: -0.1, vega: 0.2 } })]), now, maxDeadlineGapHours: 168 });
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({ status: "selected", premiumUsd: "3", quantityUnderlying: "0.4", goalCoverageBps: 10000, coverageMode: "full", estimatedFloorUsd: "1197", impliedVolatilityBps: 6500 });
    expect(result.candidates[0]!.scenarios.map(({ key }) => key)).toEqual(["down", "flat", "up"]);
    expect(result.ethSpotUsd).toBe("3000");
    expect(result.chain).toHaveLength(1);
    expect(result.chain[0]).toMatchObject({ protocolOrderId: result.candidates[0]!.protocolOrderId, premiumUsd: "3", settlementType: "cash", impliedVolatilityBps: 6500 });
  });

  it("returns the full ranked viable chain while persisting the first five", async () => {
    const result = await generateProtectionCandidates(goal, { client: client([order(21n), order(22n), order(23n), order(24n), order(25n), order(26n)]), now, maxDeadlineGapHours: 168 });
    expect(result.candidates).toHaveLength(5);
    expect(result.candidates.filter(({ status }) => status === "selected")).toHaveLength(1);
    expect(result.chain).toHaveLength(6);
    expect(result.chain.map(({ protocolOrderId }) => protocolOrderId)).toEqual(result.chain.slice().sort((a, b) => a.protocolOrderId.localeCompare(b.protocolOrderId)).map(({ protocolOrderId }) => protocolOrderId));
  });

  it("rejects orders that make the user sell protection", async () => {
    const result = await generateProtectionCandidates(goal, { client: client([order(2n, { isBuyer: true })]), now, maxDeadlineGapHours: 168 });
    expect(result.candidates).toEqual([]);
    expect(result.rejected[0]).toMatchObject({ strikeUsd: "3000", expiry: "2026-10-01T00:00:00.000Z", premiumUsd: "3" });
    expect(result.rejected[0]?.reasons).toContain("The order does not let the user buy protection.");
  });

  it.each([
    ["wrong option type", (item: OrderWithSignature) => { item.order.optionType = 0; }, "Only a vanilla cash-settled ETH put is supported."],
    ["wrong implementation", (item: OrderWithSignature) => { item.rawApiData!.implementation = "0x6666666666666666666666666666666666666666"; }, "Only a vanilla cash-settled ETH put is supported."],
    ["wrong collateral", (item: OrderWithSignature) => { item.order.collateralToken = "0x7777777777777777777777777777777777777777"; }, "P0 supports USDC-settled OptionBook orders only."],
    ["malformed signature", (item: OrderWithSignature) => { item.signature = "0x1234"; }, "The order signature is malformed."],
    ["expired order", (item: OrderWithSignature) => { item.order.deadline = BigInt(Date.parse("2026-08-31T00:00:00.000Z") / 1000); }, "The order is expired or too close to expiry."],
    ["empty liquidity", (item: OrderWithSignature) => { item.availableAmount = 0n; }, "The order has no available liquidity."],
  ])("fails closed for %s", async (_label, mutate, expectedReason) => {
    const invalid = order(4n); mutate(invalid);
    const result = await generateProtectionCandidates(goal, { client: client([invalid]), now, maxDeadlineGapHours: 168 });
    expect(result.candidates).toEqual([]);
    expect(result.rejected[0]?.reasons).toContain(expectedReason);
  });

  it("refuses full mode when SDK preview liquidity cannot reach 10000 bps", async () => {
    const result = await generateProtectionCandidates(goal, {
      client: client([order(5n)], (_order, amount) => ({ numContracts: 200_000n, maxContracts: 200_000n, collateralToken: usdc, pricePerContract: 750_000_000n, totalCollateral: amount, referrer: "0x0000000000000000000000000000000000000000", maker, expiry, isCall: false, strikes: [300_000_000_000n] })),
      now,
      maxDeadlineGapHours: 168,
    });
    expect(result.candidates).toEqual([]);
    expect(result.rejected[0]?.reasons).toContain("The available order does not fully cover the stated goal.");
  });

  it("rejects malformed raw availability without throwing or fabricating inventory", async () => {
    const malformed = order(8n);
    (malformed.rawApiData as unknown as { maxCollateralUsable: string }).maxCollateralUsable = "not-a-base-unit";
    const result = await generateProtectionCandidates(goal, { client: client([malformed]), now, maxDeadlineGapHours: 168 });
    expect(result.candidates).toEqual([]);
    expect(result.rejected[0]?.reasons).toContain("The order has no available liquidity.");
  });

  it("ranks otherwise equivalent candidates by stable protocol order ID", async () => {
    const result = await generateProtectionCandidates(goal, { client: client([order(9n), order(7n)]), now, maxDeadlineGapHours: 168 });
    expect(result.candidates.map((candidate) => candidate.protocolOrderId)).toEqual([`0x${"0".repeat(129)}7`, `0x${"0".repeat(129)}9`]);
  });

  it("uses the official preview to create an explicit, one-USDC proportional demo", async () => {
    const result = await generateProtectionCandidates(goal, { client: client([order(3n)]), now, maxDeadlineGapHours: 168, coverageMode: "proportional_demo" });
    expect(result.candidates[0]).toMatchObject({ coverageMode: "proportional_demo", premiumAmountBaseUnits: "1000000", premiumUsd: "1", quantityUnderlying: "0.133333", goalCoverageBps: 3333 });
  });

  it("keeps proportional previews below the caller budget and the global cap", async () => {
    const budgetLimitedGoal = { ...goal, maxPremiumUsd: "0.5" };
    const result = await generateProtectionCandidates(budgetLimitedGoal, { client: client([order(6n)]), now, maxDeadlineGapHours: 168, coverageMode: "proportional_demo" });
    expect(result.candidates[0]).toMatchObject({ coverageMode: "proportional_demo", premiumAmountBaseUnits: "500000", goalCoverageBps: 1666 });
    expect(result.candidates[0]!.scenarios[0]).toMatchObject({ underlyingValueUsd: "840", premiumCostUsd: "0.5" });
  });

  it("falls back to a physically-settled candidate when no cash-settled order is viable", async () => {
    const result = await generateProtectionCandidates(goal, { client: client([physicalOrder(10n)]), now, maxDeadlineGapHours: 168 });
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({ status: "selected", settlementType: "physical", settlementTokenSymbol: "aBasUSDC", settlementTokenAddress: aBasUsdc, premiumUsd: "3", goalCoverageBps: 10000 });
  });

  it("never evaluates or selects a physical candidate when a viable cash candidate exists", async () => {
    const result = await generateProtectionCandidates(goal, { client: client([order(11n), physicalOrder(12n)]), now, maxDeadlineGapHours: 168 });
    // The physical order is reported as one of the cash pass's own rejections (every order is
    // evaluated against the cash rule set), but the settlement-type-specific physical pass never
    // runs at all -- proven by the winning candidate always being cash, never physical, even
    // though the physical order here would otherwise be perfectly viable on its own tier.
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({ settlementType: "cash" });
    const physicalRejection = result.rejected.find((entry) => entry.protocolOrderId?.toLowerCase() === physicalOrder(12n).signature.toLowerCase());
    expect(physicalRejection?.reasons).toContain("Only a vanilla cash-settled ETH put is supported.");
  });

  it("ranks physical fallback candidates deterministically within their own tier", async () => {
    const result = await generateProtectionCandidates(goal, { client: client([physicalOrder(14n), physicalOrder(13n)]), now, maxDeadlineGapHours: 168 });
    expect(result.candidates.map((candidate) => candidate.settlementType)).toEqual(["physical", "physical"]);
    expect(result.candidates.map((candidate) => candidate.protocolOrderId)).toEqual([`0x${"0".repeat(129)}d`, `0x${"0".repeat(129)}e`]);
  });

  it("reports combined cash and physical rejection reasons when both tiers fail", async () => {
    const badCash = order(15n, { isBuyer: true });
    const badPhysical = physicalOrder(16n, { isBuyer: true });
    const result = await generateProtectionCandidates(goal, { client: client([badCash, badPhysical]), now, maxDeadlineGapHours: 168 });
    expect(result.candidates).toEqual([]);
    // Both orders are independently evaluated against both tiers (cash then physical), so each
    // of the 2 orders contributes one rejection per pass = 4 total, all citing the shared defect.
    expect(result.rejected).toHaveLength(4);
    expect(result.rejected.every((entry) => entry.reasons.includes("The order does not let the user buy protection."))).toBe(true);
  });

  it("rejects a physical order whose collateral token is not recognized by the SDK's chain configuration", async () => {
    const unknownToken = "0x8888888888888888888888888888888888888888";
    const badOrder = order(17n, { collateralToken: unknownToken }, { implementation: physicalPut, collateral: unknownToken });
    const result = await generateProtectionCandidates(goal, { client: client([badOrder]), now, maxDeadlineGapHours: 168 });
    expect(result.candidates).toEqual([]);
    expect(result.rejected.some((entry) => entry.reasons.includes("The order's collateral token could not be verified."))).toBe(true);
  });
});
