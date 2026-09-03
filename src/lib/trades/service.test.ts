import { describe, expect, it, vi } from "vitest";

import type { GoalGuardRepository } from "@/lib/db/repository";
import { ApiRouteError } from "@/lib/server/http";
import { fixtureCandidate, fixtureDecision, fixtureIds, fixtureReadyGoal } from "@/test/fixtures/goalguard";
import { type ThetanutsOrder } from "@/lib/thetanuts/client";
import { orderId, serializeOrder } from "@/lib/thetanuts/strategy";
import { prepareExecution, previewTrade, recordSubmission } from "./service";

const now = new Date("2026-08-31T12:00:00.000Z");
const wallet = "0x1111111111111111111111111111111111111111";
const optionBook = "0x3333333333333333333333333333333333333333";

function order(): ThetanutsOrder {
  return {
    order: { maker: "0x2222222222222222222222222222222222222222", taker: "0x0000000000000000000000000000000000000000", option: "0x4444444444444444444444444444444444444444", isBuyer: false, numContracts: 2_500_000_000_000_000n, price: 100_000_000n, expiry: 1_800_000_000n, nonce: 1n, optionType: 1, strikes: [2_800_000_000n], collateralToken: fixtureCandidate.settlementTokenAddress, underlyingToken: "0x5555555555555555555555555555555555555555", deadline: 1_800_000_000n },
    signature: `0x${"11".repeat(65)}`, availableAmount: 10_000_000_000_000_000n, makerAddress: "0x2222222222222222222222222222222222222222",
    rawApiData: { collateral: fixtureCandidate.settlementTokenAddress, priceFeed: "0x5555555555555555555555555555555555555555", isCall: false, orderExpiryTimestamp: "1800000000" },
  } as unknown as ThetanutsOrder;
}

function setup(changed = false) {
  const live = order();
  const candidate = { ...fixtureCandidate, protocolOrderId: orderId(live), protocolRaw: serializeOrder(changed ? { ...live, availableAmount: 1n } : live), marketAsOf: now.toISOString(), expiry: new Date(1_800_000_000_000).toISOString() };
  const createTrade = vi.fn(async (trade) => trade);
  const repository = {
    getGoal: vi.fn(async () => fixtureReadyGoal), getCandidate: vi.fn(async () => candidate), getDecision: vi.fn(async () => fixtureDecision), getLatestDecision: vi.fn(async () => fixtureDecision), createTrade,
  } as unknown as GoalGuardRepository;
  const encodeFillOrder = vi.fn(() => ({ to: optionBook, data: "0xdeadbeef" }));
  const encodeApprove = vi.fn(() => ({ to: fixtureCandidate.settlementTokenAddress, data: "0x095ea7b3" }));
  const client = { api: { fetchOrders: vi.fn(async () => [live]) }, erc20: { getAllowance: vi.fn(async () => 0n), encodeApprove }, optionBook: { previewFillOrder: vi.fn(() => ({ totalCollateral: 2_500_000n, numContracts: 10_000_000_000_000_000n, maxContracts: 10_000_000_000_000_000n })), encodeFillOrder }, chainConfig: { priceFeeds: { ETH: "0x5555555555555555555555555555555555555555" } } };
  return { candidate, client, createTrade, encodeFillOrder, encodeApprove, repository };
}

describe("unsigned trade previews", () => {
  it("constructs an exact unsigned SDK preview and persists only previewed state", async () => {
    const { client, createTrade, encodeFillOrder, encodeApprove, repository } = setup();
    const result = await previewTrade(fixtureIds.goal, fixtureIds.candidate, fixtureIds.decision, wallet, "preview-request-0000000000000001", "owner", repository, { now: () => now, withClient: async (run) => run(client as never) });

    expect(result.trade.status).toBe("previewed");
    expect(result.trade.txHash).toBeNull();
    expect(result.executionTransaction).toEqual({ chainId: 8453, to: optionBook, data: "0xdeadbeef", valueBaseUnits: "0" });
    expect(result.approvalTransaction?.data).toBe("0x095ea7b3");
    expect(result.allowance?.requiredAmountBaseUnits).toBe("2500000");
    expect(encodeFillOrder).toHaveBeenCalledWith(expect.anything(), 2_500_000n, undefined);
    expect(encodeApprove).toHaveBeenCalledWith(fixtureCandidate.settlementTokenAddress, optionBook, 2_500_000n);
    expect(createTrade.mock.calls[0]?.[0]).toMatchObject({ status: "previewed", txHash: null, submittedAt: null, confirmedAt: null });
  });

  it("fails closed when the selected order fingerprint changes", async () => {
    const { client, repository } = setup(true);
    await expect(previewTrade(fixtureIds.goal, fixtureIds.candidate, fixtureIds.decision, wallet, "preview-request-0000000000000002", "owner", repository, { now: () => now, withClient: async (run) => run(client as never) })).rejects.toMatchObject({ code: "CANDIDATE_STALE" } satisfies Partial<ApiRouteError>);
  });

  it("always disables execution and submission", async () => {
    await expect(prepareExecution()).rejects.toMatchObject({ code: "EXECUTION_DISABLED" });
    await expect(recordSubmission()).rejects.toMatchObject({ code: "EXECUTION_DISABLED" });
  });
});
