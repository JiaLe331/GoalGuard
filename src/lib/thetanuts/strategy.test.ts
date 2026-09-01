// @vitest-environment node
import type { OrderWithSignature } from "@thetanuts-finance/thetanuts-client";
import { describe, expect, it } from "vitest";

import type { Goal } from "@/lib/contracts";
import { generateProtectionCandidates, type CandidateGenerationOptions } from "./strategy";

const now = new Date("2026-09-01T00:00:00.000Z");
const usdc = "0x1111111111111111111111111111111111111111";
const put = "0x2222222222222222222222222222222222222222";
const maker = "0x3333333333333333333333333333333333333333";
const expiry = BigInt(Date.parse("2026-10-01T00:00:00.000Z") / 1000);
const deadline = BigInt(Date.parse("2026-09-02T00:00:00.000Z") / 1000);

const goal: Goal = { schemaVersion: 1, id: "1b3e798c-e0e8-4ab5-9e37-d4526424eb8f", goalType: "rent", customGoalLabel: null, underlyingAsset: "ETH", protectedValueUsd: "1200", deadline: "2026-09-30", maxLossBps: 500, maxPremiumUsd: "3", originalUserMessage: "Protect rent.", status: "searching", createdAt: now.toISOString(), updatedAt: now.toISOString(), parseInferenceId: null, selectedCandidateId: null, councilDecisionId: null, tradeId: null };

function order(nonce: bigint, changes: Partial<OrderWithSignature["order"]> = {}): OrderWithSignature {
  return { order: { maker, taker: "0x0000000000000000000000000000000000000000", option: "0x0000000000000000000000000000000000000000", isBuyer: false, numContracts: 400_000n, price: 750_000_000n, expiry, nonce, optionType: 1, strikes: [300_000_000_000n], collateralToken: usdc, underlyingToken: "0x4444444444444444444444444444444444444444", deadline, ...changes }, signature: "0x1234", availableAmount: 10_000_000n, makerAddress: maker, rawApiData: { collateral: usdc, priceFeed: "0x5555555555555555555555555555555555555555", implementation: put, strikes: ["300000000000"], isCall: false, isLong: true, orderExpiryTimestamp: Number(deadline), extraOptionData: "0x", maxCollateralUsable: "10000000" } };
}

function client(orders: OrderWithSignature[]): CandidateGenerationOptions["client"] {
  return { api: { filterOrders: async () => orders, getMarketData: async () => ({ prices: { ETH: 3000 }, metadata: { lastUpdated: now.getTime(), currentTime: now.getTime() } }) }, chainConfig: { tokens: { USDC: { address: usdc, symbol: "USDC", decimals: 6 } }, implementations: { PUT: put } }, optionBook: { previewFillOrder: (_order: OrderWithSignature, amount: bigint = 0n) => ({ numContracts: amount * 100_000_000n / 750_000_000n, maxContracts: 1_000_000n, collateralToken: usdc, pricePerContract: 750_000_000n, totalCollateral: amount, referrer: "0x0000000000000000000000000000000000000000", maker, expiry, isCall: false, strikes: [300_000_000_000n] }) } } as unknown as CandidateGenerationOptions["client"];
}

describe("deterministic Thetanuts strategy", () => {
  it("creates a fully covered vanilla ETH put with exact decimal calculations", async () => {
    const result = await generateProtectionCandidates(goal, { client: client([order(1n)]), now, maxDeadlineGapHours: 168 });
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({ status: "selected", premiumUsd: "3", quantityUnderlying: "0.4", goalCoverageBps: 10000, estimatedFloorUsd: "1197" });
    expect(result.candidates[0]!.scenarios.map(({ key }) => key)).toEqual(["down", "flat", "up"]);
  });

  it("rejects orders that make the user sell protection", async () => {
    const result = await generateProtectionCandidates(goal, { client: client([order(2n, { isBuyer: true })]), now, maxDeadlineGapHours: 168 });
    expect(result.candidates).toEqual([]);
    expect(result.rejected[0]?.reasons).toContain("The order does not let the user buy protection.");
  });
});
