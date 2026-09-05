// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { CouncilReview, Goal, GonkaInference, MarketSnapshot } from "@/lib/contracts";
import type { TelegramLinkToken } from "@/lib/telegram/contracts";
import type { GoalGuardDatabase } from "@/lib/db/client";
import { PostgresGoalGuardRepository, RepositoryConflictError, RepositoryIdempotencyConflictError } from "@/lib/db/repository";
import { fixtureCandidate, fixtureDecision, fixtureGoal, fixtureTrade } from "@/test/fixtures/goalguard";

let client: PGlite; let repository: PostgresGoalGuardRepository;
const owner = "a".repeat(64); const stranger = "b".repeat(64);
const goal: Goal = { schemaVersion: 1, id: "4b3e798c-e0e8-4ab5-9e37-d4526424eb8f", goalType: "rent", customGoalLabel: null, underlyingAsset: "ETH", protectedValueUsd: "1200", deadline: "2026-09-30", maxLossBps: 500, maxPremiumUsd: null, originalUserMessage: "Protect my rent fund.", status: "draft", createdAt: "2026-08-31T12:00:00.000Z", updatedAt: "2026-08-31T12:00:00.000Z", parseInferenceId: null, selectedCandidateId: null, councilDecisionId: null, tradeId: null };

async function linkTelegram(at = "2026-08-30T12:00:00.000Z") {
  const token: TelegramLinkToken = { id: "a0000000-0000-4000-8000-00000000000a", ownerSessionHash: owner, tokenHash: "f".repeat(64), timezone: "UTC", status: "pending", expiresAt: "2099-09-30T12:00:00.000Z", consumedAt: null, createdAt: at, updatedAt: at };
  await repository.createTelegramLinkToken(token);
  await repository.consumeTelegramLinkToken({ tokenHash: token.tokenHash, telegramUserId: "9001", telegramChatId: "9001", connectionId: "b0000000-0000-4000-8000-00000000000b", now: at });
}

function inferenceFor(review: CouncilReview): GonkaInference {
  const purpose = review.role === "strategist" ? "strategist_review" : review.role === "risk_auditor" ? "risk_auditor_review" : "consumer_advocate_review";
  return { schemaVersion: 1, id: review.inferenceId, goalId: fixtureGoal.id, candidateId: fixtureCandidate.id, purpose, provider: "gonka", model: review.model, requestId: review.requestId, status: "succeeded", inputHash: "9".repeat(64), latencyMs: 25, errorCode: null, errorMessage: null, createdAt: review.createdAt, completedAt: review.createdAt };
}

beforeEach(async () => { client = new PGlite(); const db = drizzle({ client }); await migrate(db, { migrationsFolder: "./drizzle" }); repository = new PostgresGoalGuardRepository(db as unknown as GoalGuardDatabase); });
afterEach(async () => { await client.close(); });

describe("PostgresGoalGuardRepository", () => {
  it("round-trips canonical goals and isolates anonymous owners", async () => { await repository.createGoal(goal, owner); expect(await repository.getGoal(goal.id, owner)).toEqual(goal); expect(await repository.getGoal(goal.id, stranger)).toBeNull(); });
  it("allows forward goal transitions and rejects backward transitions", async () => { await repository.createGoal(goal, owner); const searching = await repository.updateGoalStatus(goal.id, owner, "searching"); expect(searching.status).toBe("searching"); await expect(repository.updateGoalStatus(goal.id, owner, "draft")).rejects.toBeInstanceOf(RepositoryConflictError); });
  it("round-trips candidate coverage mode with its coverage basis points", async () => {
    await repository.createGoal(fixtureGoal, owner);
    await repository.updateGoalStatus(fixtureGoal.id, owner, "searching");
    await repository.replaceCandidates(fixtureGoal.id, owner, [fixtureCandidate]);
    await expect(repository.getCandidate(fixtureCandidate.id, owner)).resolves.toMatchObject({ goalCoverageBps: 10000, coverageMode: "full" });
  });
  it("tracks a fresh worker heartbeat without exposing it through public entities", async () => { expect(await repository.isWorkerHealthy()).toBe(false); await repository.heartbeat("trade-monitor", "10000000-0000-4000-8000-000000000001"); expect(await repository.isWorkerHealthy()).toBe(true); });
  it("round-trips anonymous market snapshots in capture order", async () => {
    const snapshot: MarketSnapshot = { capturedAt: "2026-09-01T00:00:00.000Z", ethSpotUsd: "3000", optionCount: 58, medianIvBps: 6500, costPer100Usd30d: "2.1" };
    await expect(repository.saveMarketSnapshot(snapshot)).resolves.toEqual(snapshot);
    await expect(repository.listMarketSnapshots()).resolves.toEqual([snapshot]);
  });
  it("replays a completed idempotent trade request and rejects changed input", async () => {
    const key = "10000000-0000-4000-8000-000000000001"; const requestHash = "c".repeat(64); const response = { status: 201, body: { data: { tradeId: "trade-1" } } };
    expect(await repository.claimTradeRequest(key, "preview", owner, requestHash)).toEqual({ status: "claimed" });
    expect(await repository.claimTradeRequest(key, "preview", owner, requestHash)).toEqual({ status: "in_progress" });
    await repository.completeTradeRequest(key, owner, requestHash, null, response);
    expect(await repository.claimTradeRequest(key, "preview", owner, requestHash)).toEqual({ status: "replay", response, tradeId: null });
    await expect(repository.claimTradeRequest(key, "preview", owner, "d".repeat(64))).rejects.toBeInstanceOf(RepositoryIdempotencyConflictError);
    await expect(repository.claimTradeRequest(key, "execute", owner, requestHash)).rejects.toBeInstanceOf(RepositoryIdempotencyConflictError);
  });
  it("releases failed idempotent requests and reclaims abandoned work", async () => {
    const releasedKey = "20000000-0000-4000-8000-000000000002"; const staleKey = "30000000-0000-4000-8000-000000000003"; const requestHash = "e".repeat(64);
    expect((await repository.claimTradeRequest(releasedKey, "execute", owner, requestHash)).status).toBe("claimed");
    await repository.releaseTradeRequest(releasedKey, owner, requestHash);
    expect((await repository.claimTradeRequest(releasedKey, "execute", owner, requestHash)).status).toBe("claimed");
    expect((await repository.claimTradeRequest(staleKey, "submission", owner, requestHash)).status).toBe("claimed");
    expect((await repository.claimTradeRequest(staleKey, "submission", owner, requestHash, -1)).status).toBe("claimed");
  });
  it("reuses an unchanged council input and allocates a forced attempt atomically", async () => {
    await linkTelegram();
    await repository.createGoal(fixtureGoal, owner);
    await repository.updateGoalStatus(fixtureGoal.id, owner, "searching");
    await repository.replaceCandidates(fixtureGoal.id, owner, [fixtureCandidate]);
    for (const review of fixtureDecision.reviews) await repository.saveInference(inferenceFor(review));
    const inputHash = "8".repeat(64);
    const first = await repository.saveDecision(fixtureDecision, inputHash, owner);
    expect(first.attempt).toBe(1);
    await expect(repository.getTelegramDeliveryByDedupeKey(`council:${first.id}`)).resolves.toMatchObject({ kind: "council_approved", connectionId: "b0000000-0000-4000-8000-00000000000b", status: "pending" });
    const replay = await repository.saveDecision({ ...fixtureDecision, id: "70000000-0000-4000-8000-000000000007" }, inputHash, owner);
    expect(replay.id).toBe(first.id);
    await expect(repository.getTelegramDeliveryByDedupeKey(`council:${first.id}`)).resolves.toMatchObject({ status: "pending" });
    const forcedId = "80000000-0000-4000-8000-000000000008";
    const forcedReviews = fixtureDecision.reviews.map((review, index) => ({ ...review, id: `20000000-0000-4000-8000-00000000000${index + 1}`, decisionId: forcedId, inferenceId: `30000000-0000-4000-8000-00000000000${index + 1}`, requestId: `gonka-forced-${index + 1}` })) as [CouncilReview, CouncilReview, CouncilReview];
    for (const review of forcedReviews) await repository.saveInference(inferenceFor(review));
    const forced = await repository.saveDecision({ ...fixtureDecision, id: forcedId, reviews: forcedReviews }, inputHash, owner, false);
    expect(forced.attempt).toBe(2);
    await expect(repository.getLatestDecisionRecord(fixtureCandidate.id, owner)).resolves.toEqual({ decision: forced, inputHash });
  });
  it("surfaces only the most recent council attempt's inferences, not a stale completed one", async () => {
    await repository.createGoal(fixtureGoal, owner);
    await repository.updateGoalStatus(fixtureGoal.id, owner, "searching");
    await repository.replaceCandidates(fixtureGoal.id, owner, [fixtureCandidate]);
    for (const review of fixtureDecision.reviews) await repository.saveInference(inferenceFor(review));
    const retryStrategist: GonkaInference = { ...inferenceFor(fixtureDecision.reviews[0]!), id: "40000000-0000-4000-8000-000000000004", requestId: "gonka-retry-1", createdAt: "2026-08-31T13:00:00.000Z", completedAt: "2026-08-31T13:00:20.000Z" };
    await repository.saveInference(retryStrategist);
    const current = await repository.getCurrentCouncilAttemptInferences(fixtureGoal.id, fixtureCandidate.id, owner);
    expect(current).toHaveLength(1);
    expect(current[0]).toMatchObject({ id: retryStrategist.id, purpose: "strategist_review" });
  });

  it("atomically replaces an active preview only when the candidate and decision are current", async () => {
    await linkTelegram();
    await repository.createGoal(fixtureGoal, owner);
    await repository.updateGoalStatus(fixtureGoal.id, owner, "searching");
    await repository.replaceCandidates(fixtureGoal.id, owner, [fixtureCandidate]);
    for (const review of fixtureDecision.reviews) await repository.saveInference(inferenceFor(review));
    await repository.saveDecision(fixtureDecision, "7".repeat(64), owner);
    const expectation = { target: "0x2222222222222222222222222222222222222222", calldataHash: "b".repeat(64), valueBaseUnits: "0", verificationDeadline: "2099-09-30T08:10:00.000Z" };
    const first = await repository.createTrade(fixtureTrade, expectation, owner);
    await expect(repository.getTelegramDeliveryByDedupeKey(`preview:${first.id}`)).resolves.toMatchObject({ kind: "preview_ready", status: "pending" });
    await expect(repository.getTelegramDeliveryByDedupeKey(`preview-expiry:${first.id}`)).resolves.toBeNull();
    const replacement = await repository.createTrade({ ...fixtureTrade, id: "90000000-0000-4000-8000-000000000009", idempotencyKey: "preview-replacement-000000000001", createdAt: "2026-08-31T12:01:00.000Z", updatedAt: "2026-08-31T12:01:00.000Z" }, expectation, owner);
    expect(replacement.status).toBe("previewed");
    await expect(repository.getTrade(first.id, owner)).resolves.toMatchObject({ status: "stale" });
  });
});
