// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CouncilDecision, ProtectionCandidate, Trade } from "@/lib/contracts";
import type { GoalGuardRepository } from "@/lib/db/repository";
import { ApiRouteError } from "@/lib/server/http";
import type { ThetanutsOrder, ThetanutsReadClient } from "@/lib/thetanuts/client";
import { orderId, serializeOrder } from "@/lib/thetanuts/strategy";
import { fixtureCandidate, fixtureDecision, fixtureIds, fixtureReadyGoal } from "@/test/fixtures/goalguard";

const mocks = vi.hoisted(() => ({ callGonkaJson: vi.fn() }));
vi.mock("@/lib/gonka/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/gonka/client")>()),
  callGonkaJson: mocks.callGonkaJson,
}));

import { reviewCandidate } from "@/lib/council/service";
import { withConfiguredThetanutsRead } from "@/lib/thetanuts/client";
import { previewTrade } from "./service";

const now = new Date("2026-08-31T12:00:00.000Z");
const wallet = "0x1111111111111111111111111111111111111111";
const optionBook = "0x3333333333333333333333333333333333333333";
const settlementToken = fixtureCandidate.settlementTokenAddress;

function liveOrder(availableAmount = 10_000_000_000_000_000n): ThetanutsOrder {
  return {
    order: {
      maker: "0x2222222222222222222222222222222222222222",
      taker: "0x0000000000000000000000000000000000000000",
      option: "0x4444444444444444444444444444444444444444",
      isBuyer: false,
      numContracts: 2_500_000_000_000_000n,
      price: 100_000_000n,
      expiry: 1_800_000_000n,
      nonce: 1n,
      optionType: 1,
      strikes: [2_800_000_000n],
      collateralToken: settlementToken,
      underlyingToken: "0x5555555555555555555555555555555555555555",
      deadline: 1_800_000_000n,
    },
    signature: `0x${"11".repeat(65)}`,
    availableAmount,
    makerAddress: "0x2222222222222222222222222222222222222222",
    rawApiData: {
      collateral: settlementToken,
      priceFeed: "0x5555555555555555555555555555555555555555",
      isCall: false,
      isLong: true,
      implementation: "0x6666666666666666666666666666666666666666",
      orderExpiryTimestamp: "1800000000",
    },
  } as unknown as ThetanutsOrder;
}

function candidateFor(order: ThetanutsOrder, overrides: Partial<ProtectionCandidate> = {}): ProtectionCandidate {
  return {
    ...fixtureCandidate,
    protocolOrderId: orderId(order),
    protocolRaw: serializeOrder(order),
    marketAsOf: now.toISOString(),
    expiry: new Date(Number(order.order.expiry) * 1000).toISOString(),
    ...overrides,
  };
}

function sdkFake(order: ThetanutsOrder): ThetanutsReadClient {
  return {
    api: {
      fetchOrders: vi.fn(async () => [order]),
      getMarketData: vi.fn(),
      getUserPositionsFromIndexer: vi.fn(),
    },
    erc20: {
      getAllowance: vi.fn(async () => 0n),
      getBalance: vi.fn(),
      encodeApprove: vi.fn(() => ({ to: settlementToken, data: "0x095ea7b3" })),
    },
    optionBook: {
      previewFillOrder: vi.fn(() => ({
        totalCollateral: 2_500_000n,
        numContracts: 10_000_000_000_000_000n,
        maxContracts: 10_000_000_000_000_000n,
      })),
      encodeFillOrder: vi.fn(() => ({ to: optionBook, data: "0xdeadbeef" })),
    },
    chainConfig: {
      priceFeeds: { ETH: "0x5555555555555555555555555555555555555555" },
    },
  } as unknown as ThetanutsReadClient;
}

function repository(candidate: ProtectionCandidate, initialDecision: CouncilDecision | null = null) {
  let decision: CouncilDecision | null = initialDecision;
  let decisionInputHash: string | null = null;
  let trade: Trade | null = null;
  const readyGoal = () => ({
    ...fixtureReadyGoal,
    councilDecisionId: decision?.id ?? fixtureReadyGoal.councilDecisionId,
    tradeId: trade?.id ?? null,
  });
  const value = {
    getGoal: vi.fn(async () => readyGoal()),
    getCandidate: vi.fn(async () => candidate),
    getDecision: vi.fn(async (id: string) => decision?.id === id ? decision : null),
    getLatestDecision: vi.fn(async () => decision),
    getLatestDecisionRecord: vi.fn(async () => decision ? { decision, inputHash: decisionInputHash! } : null),
    saveInference: vi.fn(async () => undefined),
    saveDecision: vi.fn(async (next: CouncilDecision, inputHash: string) => {
      decision = next;
      decisionInputHash = inputHash;
      return next;
    }),
    createTrade: vi.fn(async (next: Trade) => {
      trade = next;
      return next;
    }),
  } as unknown as GoalGuardRepository;
  return { repository: value, getDecision: () => decision, getTrade: () => trade };
}

function configureCouncil() {
  vi.stubEnv("GONKA_API_KEY", "test-key");
  vi.stubEnv("GONKA_BASE_URL", "https://gonka.example");
  vi.stubEnv("GONKA_STRATEGIST_MODEL", "model-a");
  vi.stubEnv("GONKA_RISK_AUDITOR_MODEL", "model-b");
  vi.stubEnv("GONKA_CONSUMER_ADVOCATE_MODEL", "model-a");
  vi.stubEnv("MAX_LIVE_TRADE_PREMIUM_USD", "3");
}

function configureCouncilResponses(verdicts: Partial<Record<"strategist" | "risk_auditor" | "consumer_advocate", "approve" | "reject" | "uncertain">> = {}) {
  mocks.callGonkaJson.mockImplementation(async ({ input, model }: { input: { role: "strategist" | "risk_auditor" | "consumer_advocate" }; model: string }) => {
    const role = input.role;
    const verdict = verdicts[role] ?? "approve";
    return {
      data: {
        verdict,
        confidenceBps: 8500,
        summary: `${role} returned ${verdict}.`,
        concerns: verdict === "approve" ? [] : ["The supplied plan needs a safer review outcome."],
        requiredDisclosures: ["This is an unsigned demo preview."],
      },
      requestId: `gonka-${role}`,
      model,
      raw: { verdict },
      latencyMs: 1,
    };
  });
}

async function reviewWith(verdicts: Partial<Record<"strategist" | "risk_auditor" | "consumer_advocate", "approve" | "reject" | "uncertain">> = {}) {
  const order = liveOrder();
  const candidate = candidateFor(order);
  const state = repository(candidate);
  configureCouncilResponses(verdicts);
  const decision = await reviewCandidate(fixtureReadyGoal, candidate, "owner", false, state.repository as never);
  return { candidate, state, decision };
}

describe("B6 unsigned preview integration", () => {
  beforeEach(() => {
    mocks.callGonkaJson.mockReset();
    configureCouncil();
    vi.stubEnv("THETANUTS_RPC_URL", "");
    vi.stubEnv("THETANUTS_RPC_FALLBACK_URL", "");
  });

  it("runs goal -> candidate -> approved council -> unsigned construction -> previewed", async () => {
    const { candidate, state, decision } = await reviewWith();
    const client = sdkFake(liveOrder());
    const preview = await previewTrade(
      fixtureIds.goal,
      candidate.id,
      decision.id,
      wallet,
      "preview-integration-approved-1",
      "owner",
      state.repository,
      { now: () => now, withClient: async (run) => run(client) },
    );

    expect(decision.status).toBe("approved");
    expect(preview.trade.status).toBe("previewed");
    expect(preview.trade.txHash).toBeNull();
    expect(preview.trade.submittedAt).toBeNull();
    expect(preview.trade.confirmedAt).toBeNull();
    expect(preview.executionTransaction).toEqual({ chainId: 8453, to: optionBook, data: "0xdeadbeef", valueBaseUnits: "0" });
    expect(preview.approvalTransaction).not.toBeNull();
    expect(state.repository.createTrade).toHaveBeenCalledOnce();
    expect(state.getTrade()?.status).toBe("previewed");
    expect(state.getTrade()?.txHash).toBeNull();
  });

  it.each([
    // Two uncertain verdicts: consensus needs a two-thirds majority, so this loses it and stays
    // disputed. A single uncertain verdict is an approval-with-disclosure and does not stop here.
    ["disputed", { consumer_advocate: "uncertain" as const, strategist: "uncertain" as const }],
    ["blocked", { risk_auditor: "reject" as const }],
  ] as const)("stops a %s council result before construction", async (status, verdicts) => {
    const { candidate, state, decision } = await reviewWith(verdicts);
    const client = sdkFake(liveOrder());

    await expect(previewTrade(
      fixtureIds.goal,
      candidate.id,
      decision.id,
      wallet,
      `preview-integration-${status}-1`,
      "owner",
      state.repository,
      { now: () => now, withClient: async (run) => run(client) },
    )).rejects.toMatchObject({ code: "CANDIDATE_STALE" } satisfies Partial<ApiRouteError>);

    expect(decision.status).toBe(status);
    expect(client.optionBook.previewFillOrder).not.toHaveBeenCalled();
    expect(state.repository.createTrade).not.toHaveBeenCalled();
  });

  it("rejects changed live order data and an expired candidate before creating a trade", async () => {
    const order = liveOrder();
    const changedState = repository(candidateFor(order), fixtureDecision);
    const changedClient = sdkFake(liveOrder(1n));
    const approved = { ...fixtureDecision, id: fixtureIds.decision };
    const changedPreview = previewTrade(
      fixtureIds.goal,
      fixtureIds.candidate,
      approved.id,
      wallet,
      "preview-integration-stale-1",
      "owner",
      changedState.repository,
      { now: () => now, withClient: async (run) => run(changedClient) },
    );
    await expect(changedPreview).rejects.toMatchObject({ code: "CANDIDATE_STALE" } satisfies Partial<ApiRouteError>);
    expect(changedState.repository.createTrade).not.toHaveBeenCalled();

    const expiredCandidate = candidateFor(order, { expiry: "2026-08-31T11:59:00.000Z" });
    const expiredState = repository(expiredCandidate, fixtureDecision);
    await expect(previewTrade(
      fixtureIds.goal,
      expiredCandidate.id,
      approved.id,
      wallet,
      "preview-integration-expired-1",
      "owner",
      expiredState.repository,
      { now: () => now, withClient: async (run) => run(sdkFake(order)) },
    )).rejects.toMatchObject({ code: "CANDIDATE_STALE" } satisfies Partial<ApiRouteError>);
    expect(expiredState.repository.createTrade).not.toHaveBeenCalled();
  });

  it("fails safely when both Thetanuts providers are absent", async () => {
    await expect(withConfiguredThetanutsRead(async () => "should-not-run")).rejects.toThrow("both primary and fallback Base RPC URLs");
  });
});
