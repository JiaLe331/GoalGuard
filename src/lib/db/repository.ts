import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, lte, or } from "drizzle-orm";

import {
  candidateFromRow, candidateToRow, decisionFromRows, decisionToRows, goalFromRow, goalToRow,
  inferenceToRow, marketSnapshotFromRow, marketSnapshotToRow, telegramConnectionFromRow, telegramConnectionToRow,
  telegramLinkTokenFromRow, telegramLinkTokenToRow, telegramNotificationDeliveryFromRow, telegramNotificationDeliveryToRow,
  telegramNotificationPreferencesFromRow, telegramNotificationPreferencesToRow, telegramWebhookUpdateToRow,
  tradeFromRow, tradeToRow, type TradeExecutionExpectation,
} from "@/lib/contracts/db-mappers";
import type { CouncilDecision, Goal, GoalStatus, GonkaInference, MarketSnapshot, ProtectionCandidate, Trade, TradeStatus, UUID } from "@/lib/contracts";
import {
  TelegramConnectionSchema,
  TelegramLinkTokenSchema,
  TelegramNotificationDeliverySchema,
  TelegramNotificationPayloadSchema,
  TelegramWebhookUpdateSchema,
  type TelegramConnection,
  type TelegramLinkToken,
  type TelegramNotificationDelivery,
  type TelegramNotificationPreferences,
  type TelegramWebhookUpdate,
} from "@/lib/telegram/contracts";
import type {
  ConsumeTelegramLinkTokenInput,
  ConsumedTelegramLink,
  TelegramCommandProcessingInput,
  TelegramCommandProcessingResult,
  TelegramDeliveryClaimOptions,
  TelegramDeliveryEnqueueInput,
  TelegramNotificationPreferenceValues,
  TelegramRepository,
  TelegramStartProcessingInput,
  TelegramStartProcessingResult,
} from "@/lib/telegram/repository";
import { councilNotificationPayload, previewExpiringNotificationPayload, previewReadyNotificationPayload } from "@/lib/telegram/messages";

import { getDatabase, type GoalGuardDatabase } from "./client";
import {
  councilDecisions,
  councilReviews,
  goals,
  gonkaInferences,
  marketSnapshots,
  protectionCandidates,
  telegramConnections,
  telegramLinkTokens,
  telegramNotificationDeliveries,
  telegramNotificationPreferences,
  telegramWebhookUpdates,
  tradeRequestIdempotency,
  trades,
  workerHeartbeats,
} from "./schema";

export type TradeIdempotencyOperation = "preview" | "execute" | "submission";
export type TradeIdempotencyClaim =
  | { status: "claimed" }
  | { status: "in_progress" }
  | { status: "replay"; response: unknown; tradeId: string | null };

export interface TradeVerificationRecord {
  trade: Trade;
  expectedExecutionTarget: string;
  expectedCalldataHash: string;
  expectedValueBaseUnits: string;
  verificationDeadline: string;
  receiptBlockNumber: string | null;
  receiptConfirmations: number | null;
}

export interface GoalGuardRepository {
  createGoal(goal: Goal, ownerSessionHash: string): Promise<Goal>;
  getGoal(id: UUID, ownerSessionHash: string): Promise<Goal | null>;
  updateGoal(id: UUID, ownerSessionHash: string, values: Pick<Goal, "goalType" | "customGoalLabel" | "underlyingAsset" | "protectedValueUsd" | "deadline" | "maxLossBps" | "maxPremiumUsd">): Promise<Goal>;
  updateGoalStatus(id: UUID, ownerSessionHash: string, status: GoalStatus): Promise<Goal>;
  replaceCandidates(goalId: UUID, ownerSessionHash: string, candidates: ProtectionCandidate[]): Promise<void>;
  getCandidate(id: UUID, ownerSessionHash: string): Promise<ProtectionCandidate | null>;
  saveInference(inference: GonkaInference, rawResponse?: unknown): Promise<void>;
  saveDecision(decision: CouncilDecision, inputHash: string, ownerSessionHash: string, reuseMatchingInput?: boolean): Promise<CouncilDecision>;
  getLatestDecision(candidateId: UUID, ownerSessionHash: string): Promise<CouncilDecision | null>;
  getDecision(id: UUID, ownerSessionHash: string): Promise<CouncilDecision | null>;
  createTrade(trade: Trade, expectation: TradeExecutionExpectation, ownerSessionHash: string): Promise<Trade>;
  getTrade(id: UUID, ownerSessionHash: string): Promise<Trade | null>;
  transitionTrade(id: UUID, ownerSessionHash: string, from: TradeStatus[], to: TradeStatus): Promise<Trade>;
  saveMarketSnapshot(snapshot: MarketSnapshot): Promise<MarketSnapshot>;
  listMarketSnapshots(limit?: number): Promise<MarketSnapshot[]>;
}

const goalTransitions: Record<GoalStatus, GoalStatus[]> = {
  draft: ["searching", "failed"], searching: ["reviewing", "failed"], reviewing: ["ready", "failed"],
  ready: ["protected", "failed", "searching"], protected: [], failed: ["searching"],
};
const tradeTransitions: Record<TradeStatus, TradeStatus[]> = {
  previewed: ["awaiting_signature", "cancelled", "stale"], awaiting_signature: ["submitted", "cancelled", "stale"],
  submitted: ["confirmed", "failed"], confirmed: [], failed: [], cancelled: [], stale: [],
};

export class RepositoryConflictError extends Error {}
export class RepositoryNotFoundError extends Error {}
export class RepositoryIdempotencyConflictError extends Error {}

const telegramActiveStatuses = ["connected", "blocked"] as const;
const telegramPersonalizedKinds = [
  "council_approved",
  "council_disputed",
  "council_blocked",
  "preview_ready",
  "preview_expiring",
  "goal_deadline",
  "option_expiry",
] as const;

const toIso = (value: string | undefined) => value ?? new Date().toISOString();

type GoalGuardTransaction = Parameters<Parameters<GoalGuardDatabase["transaction"]>[0]>[0];

const defaultTelegramPreferences = (connectionId: string, at: string): TelegramNotificationPreferences => ({
  connectionId,
  councilResults: true,
  previewReady: true,
  previewExpiring: false,
  goalDeadlines: true,
  optionExpiry: true,
  createdAt: at,
  updatedAt: at,
});

function telegramDeliveryValue(input: TelegramDeliveryEnqueueInput): TelegramNotificationDelivery {
  const now = toIso(input.createdAt);
  return TelegramNotificationDeliverySchema.parse({
    id: input.id,
    connectionId: input.connectionId,
    telegramChatId: input.telegramChatId,
    kind: input.kind,
    goalId: input.goalId ?? null,
    candidateId: input.candidateId ?? null,
    decisionId: input.decisionId ?? null,
    tradeId: input.tradeId ?? null,
    dedupeKey: input.dedupeKey,
    payload: TelegramNotificationPayloadSchema.parse(input.payload),
    status: "pending",
    attemptCount: 0,
    nextAttemptAt: input.nextAttemptAt,
    leaseUntil: null,
    telegramMessageId: null,
    lastErrorCode: null,
    createdAt: now,
    updatedAt: now,
    sentAt: null,
  });
}

export class PostgresGoalGuardRepository implements GoalGuardRepository, TelegramRepository {
  constructor(private readonly db: GoalGuardDatabase = getDatabase().db) {}

  private async hydrateGoal(row: typeof goals.$inferSelect) {
    const [parseInference, selectedCandidate, decision, trade] = await Promise.all([
      this.db.select({ id: gonkaInferences.id }).from(gonkaInferences).where(and(eq(gonkaInferences.goalId, row.id), eq(gonkaInferences.purpose, "goal_parse"))).orderBy(desc(gonkaInferences.createdAt)).limit(1),
      this.db.select({ id: protectionCandidates.id }).from(protectionCandidates).where(and(eq(protectionCandidates.goalId, row.id), eq(protectionCandidates.status, "selected"))).limit(1),
      this.db.select({ id: councilDecisions.id }).from(councilDecisions).where(eq(councilDecisions.goalId, row.id)).orderBy(desc(councilDecisions.attempt)).limit(1),
      this.db.select({ id: trades.id }).from(trades).where(eq(trades.goalId, row.id)).orderBy(desc(trades.createdAt)).limit(1),
    ]);
    return goalFromRow(row, { parseInferenceId: parseInference[0]?.id ?? null, selectedCandidateId: selectedCandidate[0]?.id ?? null, councilDecisionId: decision[0]?.id ?? null, tradeId: trade[0]?.id ?? null });
  }

  async createGoal(goal: Goal, ownerSessionHash: string) {
    await this.db.insert(goals).values(goalToRow(goal, ownerSessionHash));
    return (await this.getGoal(goal.id, ownerSessionHash))!;
  }

  async getGoal(id: UUID, ownerSessionHash: string) {
    const rows = await this.db.select().from(goals).where(and(eq(goals.id, id), eq(goals.ownerSessionHash, ownerSessionHash))).limit(1);
    return rows[0] ? this.hydrateGoal(rows[0]) : null;
  }

  async getLatestGoalForOwner(ownerSessionHash: string) {
    const rows = await this.db.select().from(goals).where(eq(goals.ownerSessionHash, ownerSessionHash)).orderBy(desc(goals.createdAt)).limit(1);
    return rows[0] ? this.hydrateGoal(rows[0]) : null;
  }

  async listGoalsForOwner(ownerSessionHash: string, limit = 5) {
    const boundedLimit = Math.max(1, Math.min(100, Math.floor(limit)));
    const rows = await this.db.select().from(goals).where(eq(goals.ownerSessionHash, ownerSessionHash)).orderBy(desc(goals.createdAt)).limit(boundedLimit);
    return Promise.all(rows.map((row) => this.hydrateGoal(row)));
  }

  async listTelegramReminderTargets(limit = 100) {
    const boundedLimit = Math.max(1, Math.min(100, Math.floor(limit)));
    const connectionRows = await this.db.select().from(telegramConnections).where(eq(telegramConnections.status, "connected")).orderBy(desc(telegramConnections.updatedAt)).limit(boundedLimit);
    const targets = await Promise.all(connectionRows.map(async (connectionRow) => {
      const preferenceRows = await this.db.select().from(telegramNotificationPreferences).where(eq(telegramNotificationPreferences.connectionId, connectionRow.id)).limit(1);
      if (!preferenceRows[0]) return null;
      const goalsForOwner = await this.listGoalsForOwner(connectionRow.ownerSessionHash, 100);
      const goalRecords = await Promise.all(goalsForOwner.map(async (goal) => {
        const [candidate, decision, trade] = await Promise.all([
          goal.selectedCandidateId ? this.getCandidate(goal.selectedCandidateId, connectionRow.ownerSessionHash) : null,
          goal.councilDecisionId ? this.getDecision(goal.councilDecisionId, connectionRow.ownerSessionHash) : null,
          goal.tradeId ? this.getTrade(goal.tradeId, connectionRow.ownerSessionHash) : null,
        ]);
        return { goal, candidate, decision, trade };
      }));
      return { connection: telegramConnectionFromRow(connectionRow), preferences: telegramNotificationPreferencesFromRow(preferenceRows[0]), goals: goalRecords };
    }));
    return targets.filter((target): target is NonNullable<typeof target> => target !== null);
  }

  async updateGoal(id: UUID, ownerSessionHash: string, values: Pick<Goal, "goalType" | "customGoalLabel" | "underlyingAsset" | "protectedValueUsd" | "deadline" | "maxLossBps" | "maxPremiumUsd">) {
    const current = await this.getGoal(id, ownerSessionHash);
    if (!current) throw new RepositoryNotFoundError(`Goal ${id} was not found.`);
    if (!["draft", "failed", "ready"].includes(current.status)) throw new RepositoryConflictError("The goal cannot be edited while processing.");
    await this.db.update(goals).set({ ...values, status: "draft", updatedAt: new Date().toISOString() }).where(and(eq(goals.id, id), eq(goals.ownerSessionHash, ownerSessionHash)));
    return (await this.getGoal(id, ownerSessionHash))!;
  }

  async updateGoalStatus(id: UUID, ownerSessionHash: string, status: GoalStatus) {
    const current = await this.getGoal(id, ownerSessionHash);
    if (!current) throw new RepositoryNotFoundError(`Goal ${id} was not found.`);
    if (current.status !== status && !goalTransitions[current.status].includes(status)) throw new RepositoryConflictError(`Goal cannot transition from ${current.status} to ${status}.`);
    await this.db.update(goals).set({ status, updatedAt: new Date().toISOString() }).where(and(eq(goals.id, id), eq(goals.ownerSessionHash, ownerSessionHash)));
    return (await this.getGoal(id, ownerSessionHash))!;
  }

  async replaceCandidates(goalId: UUID, ownerSessionHash: string, candidates: ProtectionCandidate[]) {
    if (candidates.some((candidate) => candidate.goalId !== goalId)) throw new RepositoryConflictError("Every candidate must belong to the requested goal.");
    if (candidates.filter(({ status }) => status === "selected").length > 1) throw new RepositoryConflictError("At most one candidate may be selected.");
    if (!await this.getGoal(goalId, ownerSessionHash)) throw new RepositoryNotFoundError("Goal was not found.");
    await this.db.transaction(async (transaction) => {
      await transaction.update(protectionCandidates).set({ status: "stale", updatedAt: new Date().toISOString() }).where(eq(protectionCandidates.goalId, goalId));
      for (const candidate of candidates) await transaction.insert(protectionCandidates).values(candidateToRow(candidate)).onConflictDoUpdate({ target: protectionCandidates.id, set: candidateToRow(candidate) });
      await transaction.update(goals).set({ status: "reviewing", updatedAt: new Date().toISOString() }).where(and(eq(goals.id, goalId), eq(goals.ownerSessionHash, ownerSessionHash)));
    });
  }

  async getCandidate(id: UUID, ownerSessionHash: string) {
    const rows = await this.db.select({ candidate: protectionCandidates }).from(protectionCandidates).innerJoin(goals, eq(protectionCandidates.goalId, goals.id)).where(and(eq(protectionCandidates.id, id), eq(goals.ownerSessionHash, ownerSessionHash))).limit(1);
    return rows[0] ? candidateFromRow(rows[0].candidate) : null;
  }

  async saveInference(inference: GonkaInference, rawResponse?: unknown) { await this.db.insert(gonkaInferences).values(inferenceToRow(inference, rawResponse)); }

  async saveDecision(decision: CouncilDecision, inputHash: string, ownerSessionHash: string, reuseMatchingInput = true) {
    if (!await this.getCandidate(decision.candidateId, ownerSessionHash)) throw new RepositoryNotFoundError("Candidate was not found.");
    return this.db.transaction(async (transaction) => {
      const locked = await transaction.select({ id: protectionCandidates.id }).from(protectionCandidates).where(eq(protectionCandidates.id, decision.candidateId)).for("update").limit(1);
      if (!locked[0]) throw new RepositoryNotFoundError("Candidate was not found.");
      const latest = await transaction.select().from(councilDecisions).where(eq(councilDecisions.candidateId, decision.candidateId)).orderBy(desc(councilDecisions.attempt)).limit(1);
      if (reuseMatchingInput && latest[0]?.inputHash === inputHash) {
        const reviews = await transaction.select().from(councilReviews).where(eq(councilReviews.decisionId, latest[0].id));
        return decisionFromRows(latest[0], reviews);
      }
      const savedDecision = { ...decision, attempt: (latest[0]?.attempt ?? 0) + 1 };
      const rows = decisionToRows(savedDecision, inputHash);
      await transaction.insert(councilDecisions).values(rows.decision);
      await transaction.insert(councilReviews).values(rows.reviews);
      if (savedDecision.status === "approved") await transaction.update(goals).set({ status: "ready", updatedAt: new Date().toISOString() }).where(and(eq(goals.id, savedDecision.goalId), eq(goals.ownerSessionHash, ownerSessionHash)));
      await this.enqueueCouncilTelegramDeliveryInTransaction(transaction, savedDecision, ownerSessionHash);
      return savedDecision;
    });
  }

  private async decisionFromId(id: UUID, ownerSessionHash: string) {
    const found = await this.db.select({ decision: councilDecisions }).from(councilDecisions).innerJoin(goals, eq(councilDecisions.goalId, goals.id)).where(and(eq(councilDecisions.id, id), eq(goals.ownerSessionHash, ownerSessionHash))).limit(1);
    if (!found[0]) return null;
    const reviews = await this.db.select().from(councilReviews).where(eq(councilReviews.decisionId, id));
    return decisionFromRows(found[0].decision, reviews);
  }

  async getDecision(id: UUID, ownerSessionHash: string) { return this.decisionFromId(id, ownerSessionHash); }

  async getLatestDecision(candidateId: UUID, ownerSessionHash: string) {
    const found = await this.db.select({ id: councilDecisions.id }).from(councilDecisions).innerJoin(goals, eq(councilDecisions.goalId, goals.id)).where(and(eq(councilDecisions.candidateId, candidateId), eq(goals.ownerSessionHash, ownerSessionHash))).orderBy(desc(councilDecisions.attempt)).limit(1);
    return found[0] ? this.decisionFromId(found[0].id, ownerSessionHash) : null;
  }

  async getLatestDecisionRecord(candidateId: UUID, ownerSessionHash: string) {
    const found = await this.db.select({ decision: councilDecisions }).from(councilDecisions).innerJoin(goals, eq(councilDecisions.goalId, goals.id)).where(and(eq(councilDecisions.candidateId, candidateId), eq(goals.ownerSessionHash, ownerSessionHash))).orderBy(desc(councilDecisions.attempt)).limit(1);
    if (!found[0]) return null;
    const reviews = await this.db.select().from(councilReviews).where(eq(councilReviews.decisionId, found[0].decision.id));
    return { decision: decisionFromRows(found[0].decision, reviews), inputHash: found[0].decision.inputHash };
  }

  // Every inference written by one reviewCandidate() call shares the exact same `createdAt`
  // (a single timestamp captured once before its role loop starts, see council/service.ts) --
  // so the rows sharing the newest createdAt are exactly this candidate's current/most recent
  // attempt, and roles that attempt hasn't reached yet correctly have no row at all, rather than
  // showing a stale row from an earlier attempt.
  async getCurrentCouncilAttemptInferences(goalId: UUID, candidateId: UUID, ownerSessionHash: string) {
    const reviewPurposes = ["strategist_review", "risk_auditor_review", "consumer_advocate_review"] as const;
    const rows = await this.db.select({ inference: gonkaInferences }).from(gonkaInferences).innerJoin(goals, eq(gonkaInferences.goalId, goals.id)).where(and(eq(gonkaInferences.goalId, goalId), eq(gonkaInferences.candidateId, candidateId), eq(goals.ownerSessionHash, ownerSessionHash), inArray(gonkaInferences.purpose, reviewPurposes))).orderBy(desc(gonkaInferences.createdAt));
    if (!rows[0]) return [];
    const latestCreatedAt = rows[0].inference.createdAt;
    return rows.filter((row) => row.inference.createdAt === latestCreatedAt).map((row) => row.inference);
  }

  async createTrade(trade: Trade, expectation: TradeExecutionExpectation, ownerSessionHash: string) {
    return this.db.transaction(async (transaction) => {
      const goalRows = await transaction.select().from(goals).where(and(eq(goals.id, trade.goalId), eq(goals.ownerSessionHash, ownerSessionHash))).for("update").limit(1);
      const goal = goalRows[0];
      if (!goal) throw new RepositoryNotFoundError("Goal was not found.");
      if (goal.status !== "ready") throw new RepositoryConflictError("The goal is not ready for a trade preview.");
      const existing = await transaction.select().from(trades).where(eq(trades.idempotencyKey, trade.idempotencyKey)).limit(1);
      if (existing[0]) {
        const saved = tradeFromRow(existing[0]);
        const same = saved.goalId === trade.goalId && saved.candidateId === trade.candidateId && saved.councilDecisionId === trade.councilDecisionId && saved.walletAddress.toLowerCase() === trade.walletAddress.toLowerCase() && saved.quoteFingerprint === trade.quoteFingerprint;
        if (!same) throw new RepositoryIdempotencyConflictError("The idempotency key is already associated with another trade request.");
        return saved;
      }
      const [candidateRows, decisionRows, currentDecisionRows, submittedRows] = await Promise.all([
        transaction.select().from(protectionCandidates).where(and(eq(protectionCandidates.id, trade.candidateId), eq(protectionCandidates.goalId, trade.goalId), eq(protectionCandidates.status, "selected"))).limit(1),
        transaction.select().from(councilDecisions).where(and(eq(councilDecisions.id, trade.councilDecisionId), eq(councilDecisions.goalId, trade.goalId), eq(councilDecisions.candidateId, trade.candidateId), eq(councilDecisions.status, "approved"))).limit(1),
        transaction.select({ id: councilDecisions.id }).from(councilDecisions).where(eq(councilDecisions.goalId, trade.goalId)).orderBy(desc(councilDecisions.attempt)).limit(1),
        transaction.select({ id: trades.id }).from(trades).where(and(eq(trades.goalId, trade.goalId), eq(trades.status, "submitted"))).limit(1),
      ]);
      if (!candidateRows[0] || !decisionRows[0] || currentDecisionRows[0]?.id !== trade.councilDecisionId) throw new RepositoryConflictError("The selected candidate or council decision is no longer current.");
      if (submittedRows[0]) throw new RepositoryConflictError("A submitted trade is already being verified for this goal.");
      await transaction.update(trades).set({ status: "stale", updatedAt: new Date().toISOString() }).where(and(eq(trades.goalId, trade.goalId), inArray(trades.status, ["previewed", "awaiting_signature"])));
      const inserted = await transaction.insert(trades).values(tradeToRow(trade, expectation)).returning();
      const savedTrade = tradeFromRow(inserted[0]!);
      await this.enqueuePreviewTelegramDeliveriesInTransaction(transaction, savedTrade, goal, candidateRows[0], ownerSessionHash);
      return savedTrade;
    });
  }

  async claimTradeRequest(key: string, operation: TradeIdempotencyOperation, ownerSessionHash: string, requestHash: string, staleAfterMs = 300_000): Promise<TradeIdempotencyClaim> {
    const now = new Date().toISOString();
    const inserted = await this.db.insert(tradeRequestIdempotency).values({ key, operation, ownerSessionHash, requestHash, status: "in_progress", tradeId: null, responseJson: null, createdAt: now, updatedAt: now }).onConflictDoNothing({ target: tradeRequestIdempotency.key }).returning({ key: tradeRequestIdempotency.key });
    if (inserted[0]) return { status: "claimed" };
    const rows = await this.db.select().from(tradeRequestIdempotency).where(eq(tradeRequestIdempotency.key, key)).limit(1);
    const saved = rows[0];
    if (!saved || saved.operation !== operation || saved.ownerSessionHash !== ownerSessionHash || saved.requestHash !== requestHash) throw new RepositoryIdempotencyConflictError("The idempotency key was already used for another request.");
    if (saved.status === "completed") return { status: "replay", response: saved.responseJson, tradeId: saved.tradeId };
    const staleBefore = new Date(Date.now() - staleAfterMs).toISOString();
    const reclaimed = await this.db.update(tradeRequestIdempotency).set({ updatedAt: now }).where(and(eq(tradeRequestIdempotency.key, key), eq(tradeRequestIdempotency.status, "in_progress"), lte(tradeRequestIdempotency.updatedAt, staleBefore))).returning({ key: tradeRequestIdempotency.key });
    return reclaimed[0] ? { status: "claimed" } : { status: "in_progress" };
  }

  async completeTradeRequest(key: string, ownerSessionHash: string, requestHash: string, tradeId: string | null, response: unknown) {
    const updated = await this.db.update(tradeRequestIdempotency).set({ status: "completed", tradeId, responseJson: response, updatedAt: new Date().toISOString() }).where(and(eq(tradeRequestIdempotency.key, key), eq(tradeRequestIdempotency.ownerSessionHash, ownerSessionHash), eq(tradeRequestIdempotency.requestHash, requestHash), eq(tradeRequestIdempotency.status, "in_progress"))).returning({ key: tradeRequestIdempotency.key });
    if (!updated[0]) throw new RepositoryIdempotencyConflictError("The idempotent request could not be completed.");
  }

  async releaseTradeRequest(key: string, ownerSessionHash: string, requestHash: string) {
    await this.db.delete(tradeRequestIdempotency).where(and(eq(tradeRequestIdempotency.key, key), eq(tradeRequestIdempotency.ownerSessionHash, ownerSessionHash), eq(tradeRequestIdempotency.requestHash, requestHash), eq(tradeRequestIdempotency.status, "in_progress")));
  }

  async getTrade(id: UUID, ownerSessionHash: string) {
    const rows = await this.db.select({ trade: trades }).from(trades).innerJoin(goals, eq(trades.goalId, goals.id)).where(and(eq(trades.id, id), eq(goals.ownerSessionHash, ownerSessionHash))).limit(1);
    return rows[0] ? tradeFromRow(rows[0].trade) : null;
  }

  async transitionTrade(id: UUID, ownerSessionHash: string, from: TradeStatus[], to: TradeStatus) {
    const current = await this.getTrade(id, ownerSessionHash);
    if (!current) throw new RepositoryNotFoundError(`Trade ${id} was not found.`);
    if (!from.includes(current.status) || !tradeTransitions[current.status].includes(to)) throw new RepositoryConflictError(`Trade cannot transition from ${current.status} to ${to}.`);
    const updated = await this.db.update(trades).set({ status: to, updatedAt: new Date().toISOString() }).where(and(eq(trades.id, id), inArray(trades.status, from))).returning({ id: trades.id });
    if (updated.length !== 1) throw new RepositoryConflictError("Trade changed during the transition.");
    return (await this.getTrade(id, ownerSessionHash))!;
  }

  async getTradeVerification(id: UUID, ownerSessionHash?: string): Promise<TradeVerificationRecord | null> {
    const conditions = [eq(trades.id, id)];
    if (ownerSessionHash) conditions.push(eq(goals.ownerSessionHash, ownerSessionHash));
    const rows = await this.db.select({ trade: trades }).from(trades).innerJoin(goals, eq(trades.goalId, goals.id)).where(and(...conditions)).limit(1);
    const row = rows[0]?.trade;
    return row ? { trade: tradeFromRow(row), expectedExecutionTarget: row.expectedExecutionTarget, expectedCalldataHash: row.expectedCalldataHash, expectedValueBaseUnits: row.expectedValueBaseUnits, verificationDeadline: row.verificationDeadline, receiptBlockNumber: row.receiptBlockNumber, receiptConfirmations: row.receiptConfirmations } : null;
  }

  async recordSubmission(id: UUID, ownerSessionHash: string, txHash: string) {
    const current = await this.getTrade(id, ownerSessionHash);
    if (!current) throw new RepositoryNotFoundError("Trade was not found.");
    if ((current.status === "submitted" || current.status === "confirmed") && current.txHash?.toLowerCase() === txHash.toLowerCase()) return current;
    const updated = await this.db.update(trades).set({ status: "submitted", txHash, submittedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).where(and(eq(trades.id, id), eq(trades.status, "awaiting_signature"))).returning({ id: trades.id });
    if (updated.length !== 1) throw new RepositoryConflictError("Trade is not awaiting submission or is not owned by this session.");
    return (await this.getTrade(id, ownerSessionHash))!;
  }

  async heartbeat(workerName: string, instanceId: string, at = new Date().toISOString()) {
    await this.db.insert(workerHeartbeats).values({ workerName, instanceId, lastSeenAt: at }).onConflictDoUpdate({ target: workerHeartbeats.workerName, set: { instanceId, lastSeenAt: at } });
  }

  async saveMarketSnapshot(snapshot: MarketSnapshot) {
    const row = marketSnapshotToRow(snapshot);
    await this.db.insert(marketSnapshots).values(row).onConflictDoUpdate({ target: marketSnapshots.capturedAt, set: row });
    return snapshot;
  }

  async listMarketSnapshots(limit = 100) {
    const rows = await this.db.select().from(marketSnapshots).orderBy(desc(marketSnapshots.capturedAt)).limit(limit);
    return rows.map(marketSnapshotFromRow);
  }

  async isWorkerHealthy(workerName = "trade-monitor", maxAgeMs = 45_000) {
    const rows = await this.db.select().from(workerHeartbeats).where(eq(workerHeartbeats.workerName, workerName)).limit(1);
    return Boolean(rows[0] && Date.now() - Date.parse(rows[0].lastSeenAt) <= maxAgeMs);
  }

  async listSubmittedTrades(limit = 25) {
    const rows = await this.db.select().from(trades).where(eq(trades.status, "submitted")).orderBy(trades.updatedAt).limit(limit);
    return rows.map((row) => ({ trade: tradeFromRow(row), expectedExecutionTarget: row.expectedExecutionTarget, expectedCalldataHash: row.expectedCalldataHash, expectedValueBaseUnits: row.expectedValueBaseUnits, verificationDeadline: row.verificationDeadline, receiptBlockNumber: row.receiptBlockNumber, receiptConfirmations: row.receiptConfirmations } satisfies TradeVerificationRecord));
  }

  async confirmTrade(id: UUID, protocolPositionId: string, blockNumber: string, confirmations: number) {
    await this.db.transaction(async (transaction) => {
      const updated = await transaction.update(trades).set({ status: "confirmed", protocolPositionId, receiptBlockNumber: blockNumber, receiptConfirmations: confirmations, confirmedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).where(and(eq(trades.id, id), eq(trades.status, "submitted"))).returning({ goalId: trades.goalId });
      if (updated.length !== 1) return;
      await transaction.update(goals).set({ status: "protected", updatedAt: new Date().toISOString() }).where(and(eq(goals.id, updated[0]!.goalId), eq(goals.status, "ready")));
    });
  }

  async failSubmittedTrade(id: UUID, failureCode: string, failureMessage: string) {
    await this.db.update(trades).set({ status: "failed", failureCode, failureMessage, updatedAt: new Date().toISOString() }).where(and(eq(trades.id, id), eq(trades.status, "submitted")));
  }

  async createTelegramLinkToken(token: TelegramLinkToken) {
    const value = TelegramLinkTokenSchema.parse(token);
    await this.db.transaction(async (transaction) => {
      await transaction.update(telegramLinkTokens).set({ status: "superseded", updatedAt: value.updatedAt }).where(and(eq(telegramLinkTokens.ownerSessionHash, value.ownerSessionHash), eq(telegramLinkTokens.status, "pending")));
      await transaction.insert(telegramLinkTokens).values(telegramLinkTokenToRow(value));
    });
    return value;
  }

  async getTelegramLinkToken(tokenHash: string) {
    const rows = await this.db.select().from(telegramLinkTokens).where(eq(telegramLinkTokens.tokenHash, tokenHash)).limit(1);
    return rows[0] ? telegramLinkTokenFromRow(rows[0]) : null;
  }

  private async consumeTelegramLinkTokenInTransaction(transaction: GoalGuardTransaction, input: ConsumeTelegramLinkTokenInput): Promise<ConsumedTelegramLink | null> {
    const tokenRows = await transaction.select().from(telegramLinkTokens).where(and(eq(telegramLinkTokens.tokenHash, input.tokenHash), eq(telegramLinkTokens.status, "pending"))).for("update").limit(1);
    const tokenRow = tokenRows[0];
    if (!tokenRow) return null;
    if (Date.parse(tokenRow.expiresAt) <= Date.parse(input.now)) {
      await transaction.update(telegramLinkTokens).set({ status: "expired", updatedAt: input.now }).where(and(eq(telegramLinkTokens.id, tokenRow.id), eq(telegramLinkTokens.status, "pending")));
      return null;
    }
    const token = telegramLinkTokenFromRow(tokenRow);
    const connection = TelegramConnectionSchema.parse({
      id: input.connectionId,
      ownerSessionHash: token.ownerSessionHash,
      telegramUserId: input.telegramUserId,
      telegramChatId: input.telegramChatId,
      status: "connected",
      timezone: token.timezone,
      linkedAt: input.now,
      lastInteractionAt: input.now,
      revokedAt: null,
      createdAt: input.now,
      updatedAt: input.now,
    });
    const preferences = defaultTelegramPreferences(connection.id, input.now);

    const existingRows = await transaction.select().from(telegramConnections).where(and(
      inArray(telegramConnections.status, telegramActiveStatuses),
      or(
        eq(telegramConnections.ownerSessionHash, token.ownerSessionHash),
        eq(telegramConnections.telegramUserId, connection.telegramUserId),
        eq(telegramConnections.telegramChatId, connection.telegramChatId),
      ),
    )).for("update");

    const transferredConnectionIds: string[] = [];
    for (const existingRow of existingRows) {
      transferredConnectionIds.push(existingRow.id);
      await transaction.update(telegramConnections).set({ status: "revoked", revokedAt: input.now, updatedAt: input.now }).where(and(eq(telegramConnections.id, existingRow.id), inArray(telegramConnections.status, telegramActiveStatuses)));
      await transaction.update(telegramNotificationDeliveries).set({ status: "cancelled", leaseUntil: null, updatedAt: input.now }).where(and(
        eq(telegramNotificationDeliveries.connectionId, existingRow.id),
        eq(telegramNotificationDeliveries.status, "pending"),
        inArray(telegramNotificationDeliveries.kind, telegramPersonalizedKinds),
      ));
    }

    const consumed = await transaction.update(telegramLinkTokens).set({ status: "consumed", consumedAt: input.now, updatedAt: input.now }).where(and(eq(telegramLinkTokens.id, token.id), eq(telegramLinkTokens.status, "pending"))).returning();
    if (consumed.length !== 1) return null;
    await transaction.insert(telegramConnections).values(telegramConnectionToRow(connection));
    await transaction.insert(telegramNotificationPreferences).values(telegramNotificationPreferencesToRow(preferences));
    return { connection, preferences, transferredConnectionIds };
  }

  async consumeTelegramLinkToken(input: ConsumeTelegramLinkTokenInput): Promise<ConsumedTelegramLink | null> {
    return this.db.transaction((transaction) => this.consumeTelegramLinkTokenInTransaction(transaction, input));
  }

  private async insertTelegramDeliveryInTransaction(transaction: GoalGuardTransaction, value: TelegramNotificationDelivery) {
    const inserted = await transaction.insert(telegramNotificationDeliveries).values(telegramNotificationDeliveryToRow(value)).onConflictDoNothing({ target: telegramNotificationDeliveries.dedupeKey }).returning();
    const row = inserted[0] ?? (await transaction.select().from(telegramNotificationDeliveries).where(eq(telegramNotificationDeliveries.dedupeKey, value.dedupeKey)).limit(1))[0];
    if (!row) throw new RepositoryConflictError("Telegram delivery could not be recorded.");
    return telegramNotificationDeliveryFromRow(row);
  }

  private async cancelPersonalizedTelegramDeliveriesInTransaction(transaction: GoalGuardTransaction, connectionId: string, at: string) {
    await transaction.update(telegramNotificationDeliveries).set({ status: "cancelled", leaseUntil: null, updatedAt: at }).where(and(
      eq(telegramNotificationDeliveries.connectionId, connectionId),
      eq(telegramNotificationDeliveries.status, "pending"),
      inArray(telegramNotificationDeliveries.kind, telegramPersonalizedKinds),
    ));
  }

  private async activeTelegramContextInTransaction(transaction: GoalGuardTransaction, ownerSessionHash: string, eventAt: string) {
    const connectionRows = await transaction.select().from(telegramConnections).where(and(eq(telegramConnections.ownerSessionHash, ownerSessionHash), eq(telegramConnections.status, "connected"))).orderBy(desc(telegramConnections.updatedAt)).limit(1);
    const connectionRow = connectionRows[0];
    if (!connectionRow || Date.parse(eventAt) < Date.parse(connectionRow.linkedAt)) return null;
    const preferenceRows = await transaction.select().from(telegramNotificationPreferences).where(eq(telegramNotificationPreferences.connectionId, connectionRow.id)).limit(1);
    if (!preferenceRows[0]) return null;
    return { connection: telegramConnectionFromRow(connectionRow), preferences: telegramNotificationPreferencesFromRow(preferenceRows[0]) };
  }

  private async enqueueCouncilTelegramDeliveryInTransaction(transaction: GoalGuardTransaction, decision: CouncilDecision, ownerSessionHash: string) {
    const context = await this.activeTelegramContextInTransaction(transaction, ownerSessionHash, decision.createdAt);
    if (!context || !context.preferences.councilResults) return;
    const [goalRows, candidateRows] = await Promise.all([
      transaction.select().from(goals).where(and(eq(goals.id, decision.goalId), eq(goals.ownerSessionHash, ownerSessionHash))).limit(1),
      transaction.select().from(protectionCandidates).where(and(eq(protectionCandidates.id, decision.candidateId), eq(protectionCandidates.goalId, decision.goalId))).limit(1),
    ]);
    if (!goalRows[0] || !candidateRows[0]) return;
    const goal = goalFromRow(goalRows[0]);
    const candidate = candidateFromRow(candidateRows[0]);
    const payload = councilNotificationPayload(decision, goal, candidate);
    await this.insertTelegramDeliveryInTransaction(transaction, telegramDeliveryValue({
      id: randomUUID(),
      connectionId: context.connection.id,
      telegramChatId: context.connection.telegramChatId,
      kind: payload.kind,
      goalId: goal.id,
      candidateId: candidate.id,
      decisionId: decision.id,
      dedupeKey: `council:${decision.id}`,
      payload,
      nextAttemptAt: decision.createdAt,
      createdAt: decision.createdAt,
    }));
  }

  private async enqueuePreviewTelegramDeliveriesInTransaction(transaction: GoalGuardTransaction, trade: Trade, goalRow: typeof goals.$inferSelect, candidateRow: typeof protectionCandidates.$inferSelect, ownerSessionHash: string) {
    const context = await this.activeTelegramContextInTransaction(transaction, ownerSessionHash, trade.createdAt);
    if (!context) return;
    const goal = goalFromRow(goalRow);
    const candidate = candidateFromRow(candidateRow);
    if (context.preferences.previewReady) {
      await this.insertTelegramDeliveryInTransaction(transaction, telegramDeliveryValue({
        id: randomUUID(),
        connectionId: context.connection.id,
        telegramChatId: context.connection.telegramChatId,
        kind: "preview_ready",
        goalId: goal.id,
        candidateId: candidate.id,
        decisionId: trade.councilDecisionId,
        tradeId: trade.id,
        dedupeKey: `preview:${trade.id}`,
        payload: previewReadyNotificationPayload(trade, goal, candidate),
        nextAttemptAt: trade.createdAt,
        createdAt: trade.createdAt,
      }));
    }
    if (context.preferences.previewExpiring) {
      const nextAttemptAt = new Date(Date.parse(trade.previewExpiresAt) - 30_000).toISOString();
      await this.insertTelegramDeliveryInTransaction(transaction, telegramDeliveryValue({
        id: randomUUID(),
        connectionId: context.connection.id,
        telegramChatId: context.connection.telegramChatId,
        kind: "preview_expiring",
        goalId: goal.id,
        candidateId: candidate.id,
        decisionId: trade.councilDecisionId,
        tradeId: trade.id,
        dedupeKey: `preview-expiry:${trade.id}`,
        payload: previewExpiringNotificationPayload(trade, goal),
        nextAttemptAt,
        createdAt: trade.createdAt,
      }));
    }
  }

  async processTelegramStart(input: TelegramStartProcessingInput): Promise<TelegramStartProcessingResult> {
    const update = TelegramWebhookUpdateSchema.parse(input.update);
    const successDelivery = telegramDeliveryValue(input.successDelivery);
    const fallbackDelivery = telegramDeliveryValue(input.fallbackDelivery);
    return this.db.transaction(async (transaction) => {
      const recorded = await transaction.insert(telegramWebhookUpdates).values(telegramWebhookUpdateToRow(update)).onConflictDoNothing({ target: telegramWebhookUpdates.updateId }).returning({ updateId: telegramWebhookUpdates.updateId });
      if (recorded.length !== 1) return { duplicate: true, connection: null, preferences: null, delivery: null };

      const linked = input.tokenHash
        ? await this.consumeTelegramLinkTokenInTransaction(transaction, {
          tokenHash: input.tokenHash,
          telegramUserId: input.telegramUserId,
          telegramChatId: input.telegramChatId,
          connectionId: input.connectionId,
          now: input.now,
        })
        : null;
      const delivery = linked ? successDelivery : fallbackDelivery;
      if (linked && (delivery.connectionId !== linked.connection.id || delivery.telegramChatId !== linked.connection.telegramChatId)) throw new RepositoryConflictError("Telegram connection receipt does not match the linked chat.");
      const recordedDelivery = await this.insertTelegramDeliveryInTransaction(transaction, delivery);
      return { duplicate: false, connection: linked?.connection ?? null, preferences: linked?.preferences ?? null, delivery: recordedDelivery };
    });
  }

  async processTelegramCommand(input: TelegramCommandProcessingInput): Promise<TelegramCommandProcessingResult> {
    const update = TelegramWebhookUpdateSchema.parse(input.update);
    const delivery = telegramDeliveryValue(input.delivery);
    return this.db.transaction(async (transaction) => {
      const recorded = await transaction.insert(telegramWebhookUpdates).values(telegramWebhookUpdateToRow(update)).onConflictDoNothing({ target: telegramWebhookUpdates.updateId }).returning({ updateId: telegramWebhookUpdates.updateId });
      if (recorded.length !== 1) return { duplicate: true, connection: null, preferences: null, delivery: null };

      let connection: TelegramConnection | null = null;
      let preferences: TelegramNotificationPreferences | null = null;
      if (input.action === "preferences") {
        if (!input.connectionId || !input.preferenceValues) throw new RepositoryConflictError("Telegram preference updates require an active connection.");
        const connectionRows = await transaction.select().from(telegramConnections).where(and(eq(telegramConnections.id, input.connectionId), eq(telegramConnections.status, "connected"))).for("update").limit(1);
        if (!connectionRows[0]) throw new RepositoryConflictError("Telegram connection is no longer active.");
        const updated = await transaction.update(telegramNotificationPreferences).set({ ...input.preferenceValues, updatedAt: input.now }).where(eq(telegramNotificationPreferences.connectionId, input.connectionId)).returning();
        if (!updated[0]) throw new RepositoryNotFoundError("Telegram connection preferences were not found.");
        connection = telegramConnectionFromRow(connectionRows[0]);
        preferences = telegramNotificationPreferencesFromRow(updated[0]);
      } else if (input.action === "unlink" && input.connectionId) {
        const revoked = await transaction.update(telegramConnections).set({ status: "revoked", revokedAt: input.now, updatedAt: input.now }).where(and(eq(telegramConnections.id, input.connectionId), inArray(telegramConnections.status, telegramActiveStatuses))).returning();
        if (revoked[0]) {
          connection = telegramConnectionFromRow(revoked[0]);
          await this.cancelPersonalizedTelegramDeliveriesInTransaction(transaction, input.connectionId, input.now);
        }
      }
      if (input.action !== "unlink" && input.connectionId) {
        await transaction.update(telegramConnections).set({ lastInteractionAt: input.now, updatedAt: input.now }).where(and(eq(telegramConnections.id, input.connectionId), inArray(telegramConnections.status, telegramActiveStatuses)));
      }
      const recordedDelivery = await this.insertTelegramDeliveryInTransaction(transaction, delivery);
      return { duplicate: false, connection, preferences, delivery: recordedDelivery };
    });
  }

  async getTelegramConnectionForOwner(ownerSessionHash: string) {
    const rows = await this.db.select().from(telegramConnections).where(and(eq(telegramConnections.ownerSessionHash, ownerSessionHash), inArray(telegramConnections.status, telegramActiveStatuses))).orderBy(desc(telegramConnections.updatedAt)).limit(1);
    return rows[0] ? telegramConnectionFromRow(rows[0]) : null;
  }

  async getTelegramConnectionById(id: string) {
    const rows = await this.db.select().from(telegramConnections).where(and(eq(telegramConnections.id, id), inArray(telegramConnections.status, telegramActiveStatuses))).limit(1);
    return rows[0] ? telegramConnectionFromRow(rows[0]) : null;
  }

  async getTelegramConnectionByChatId(telegramChatId: string) {
    const rows = await this.db.select().from(telegramConnections).where(and(eq(telegramConnections.telegramChatId, telegramChatId), inArray(telegramConnections.status, telegramActiveStatuses))).orderBy(desc(telegramConnections.updatedAt)).limit(1);
    return rows[0] ? telegramConnectionFromRow(rows[0]) : null;
  }

  async getTelegramPreferences(connectionId: string) {
    const rows = await this.db.select().from(telegramNotificationPreferences).where(eq(telegramNotificationPreferences.connectionId, connectionId)).limit(1);
    return rows[0] ? telegramNotificationPreferencesFromRow(rows[0]) : null;
  }

  async updateTelegramPreferences(connectionId: string, values: TelegramNotificationPreferenceValues, at = new Date().toISOString()) {
    const updated = await this.db.update(telegramNotificationPreferences).set({ ...values, updatedAt: at }).where(eq(telegramNotificationPreferences.connectionId, connectionId)).returning();
    if (!updated[0]) throw new RepositoryNotFoundError("Telegram connection was not found.");
    return telegramNotificationPreferencesFromRow(updated[0]);
  }

  async revokeTelegramConnectionForOwner(ownerSessionHash: string, at = new Date().toISOString()) {
    const connection = await this.getTelegramConnectionForOwner(ownerSessionHash);
    if (!connection) return null;
    return this.revokeTelegramConnection(connection.id, at);
  }

  async revokeTelegramConnection(id: string, at = new Date().toISOString()) {
    return this.db.transaction(async (transaction) => {
      const rows = await transaction.update(telegramConnections).set({ status: "revoked", revokedAt: at, updatedAt: at }).where(and(eq(telegramConnections.id, id), inArray(telegramConnections.status, telegramActiveStatuses))).returning();
      const row = rows[0];
      if (!row) return null;
      await this.cancelPersonalizedTelegramDeliveriesInTransaction(transaction, id, at);
      return telegramConnectionFromRow(row);
    });
  }

  async blockTelegramConnection(id: string, at = new Date().toISOString()) {
    return this.db.transaction(async (transaction) => {
      const rows = await transaction.update(telegramConnections).set({ status: "blocked", revokedAt: at, updatedAt: at }).where(and(eq(telegramConnections.id, id), eq(telegramConnections.status, "connected"))).returning();
      const row = rows[0];
      if (!row) return null;
      await transaction.update(telegramNotificationDeliveries).set({ status: "cancelled", leaseUntil: null, updatedAt: at }).where(and(eq(telegramNotificationDeliveries.connectionId, id), eq(telegramNotificationDeliveries.status, "pending"), inArray(telegramNotificationDeliveries.kind, telegramPersonalizedKinds)));
      return telegramConnectionFromRow(row);
    });
  }

  async touchTelegramConnection(id: string, at = new Date().toISOString()) {
    await this.db.update(telegramConnections).set({ lastInteractionAt: at, updatedAt: at }).where(and(eq(telegramConnections.id, id), inArray(telegramConnections.status, telegramActiveStatuses)));
  }

  async recordTelegramWebhookUpdate(update: TelegramWebhookUpdate) {
    const value = TelegramWebhookUpdateSchema.parse(update);
    const inserted = await this.db.insert(telegramWebhookUpdates).values(telegramWebhookUpdateToRow(value)).onConflictDoNothing({ target: telegramWebhookUpdates.updateId }).returning({ updateId: telegramWebhookUpdates.updateId });
    return inserted.length === 1;
  }

  async enqueueTelegramDelivery(input: TelegramDeliveryEnqueueInput) {
    const value = telegramDeliveryValue(input);
    const inserted = await this.db.insert(telegramNotificationDeliveries).values(telegramNotificationDeliveryToRow(value)).onConflictDoNothing({ target: telegramNotificationDeliveries.dedupeKey }).returning();
    if (inserted[0]) return telegramNotificationDeliveryFromRow(inserted[0]);
    const existing = await this.getTelegramDeliveryByDedupeKey(value.dedupeKey);
    if (!existing) throw new RepositoryConflictError("Telegram delivery deduplication could not be resolved.");
    return existing;
  }

  async getTelegramDeliveryByDedupeKey(dedupeKey: string) {
    const rows = await this.db.select().from(telegramNotificationDeliveries).where(eq(telegramNotificationDeliveries.dedupeKey, dedupeKey)).limit(1);
    return rows[0] ? telegramNotificationDeliveryFromRow(rows[0]) : null;
  }

  async listPendingTelegramReminders(connectionId: string, limit = 100) {
    const reminderKinds = ["preview_expiring", "goal_deadline", "option_expiry"] as const;
    const boundedLimit = Math.max(1, Math.min(100, Math.floor(limit)));
    const rows = await this.db.select().from(telegramNotificationDeliveries).where(and(eq(telegramNotificationDeliveries.connectionId, connectionId), eq(telegramNotificationDeliveries.status, "pending"), inArray(telegramNotificationDeliveries.kind, reminderKinds))).orderBy(telegramNotificationDeliveries.nextAttemptAt).limit(boundedLimit);
    return rows.map(telegramNotificationDeliveryFromRow);
  }

  async isTelegramDeliverySendable(delivery: TelegramNotificationDelivery, now = new Date().toISOString()) {
    if (delivery.kind === "command_reply" || delivery.kind === "unlink_confirmation" || delivery.kind === "connection_receipt") return true;
    if (!delivery.connectionId) return false;
    const connection = await this.getTelegramConnectionById(delivery.connectionId);
    if (!connection || connection.status !== "connected") return false;
    const preferences = await this.getTelegramPreferences(connection.id);
    if (!preferences) return false;
    const preferenceEnabled = delivery.kind === "council_approved" || delivery.kind === "council_disputed" || delivery.kind === "council_blocked"
      ? preferences.councilResults
      : delivery.kind === "preview_ready"
        ? preferences.previewReady
        : delivery.kind === "preview_expiring"
          ? preferences.previewExpiring
          : delivery.kind === "goal_deadline"
            ? preferences.goalDeadlines
            : preferences.optionExpiry;
    if (!preferenceEnabled) return false;

    if (delivery.kind === "goal_deadline") {
      if (!delivery.goalId || delivery.payload.kind !== "goal_deadline") return false;
      const goal = await this.getGoal(delivery.goalId, connection.ownerSessionHash);
      return Boolean(goal && goal.status !== "failed" && goal.deadline === delivery.payload.deadline);
    }
    if (delivery.kind === "option_expiry") {
      if (!delivery.goalId || !delivery.candidateId || !delivery.decisionId || delivery.payload.kind !== "option_expiry") return false;
      const [goal, candidate, decision, latestDecision] = await Promise.all([
        this.getGoal(delivery.goalId, connection.ownerSessionHash),
        this.getCandidate(delivery.candidateId, connection.ownerSessionHash),
        this.getDecision(delivery.decisionId, connection.ownerSessionHash),
        this.getLatestDecision(delivery.candidateId, connection.ownerSessionHash),
      ]);
      return Boolean(goal && goal.status === "ready" && goal.selectedCandidateId === candidate?.id && candidate.status === "selected" && candidate.expiry === delivery.payload.expiresAt && decision?.status === "approved" && latestDecision?.id === decision.id && Date.parse(candidate.expiry) > Date.parse(now));
    }
    if (delivery.kind === "preview_ready" || delivery.kind === "preview_expiring") {
      if (!delivery.goalId || !delivery.candidateId || !delivery.tradeId) return false;
      const [goal, candidate, trade] = await Promise.all([
        this.getGoal(delivery.goalId, connection.ownerSessionHash),
        this.getCandidate(delivery.candidateId, connection.ownerSessionHash),
        this.getTrade(delivery.tradeId, connection.ownerSessionHash),
      ]);
      if (!goal || !candidate || !trade || trade.status !== "previewed" || goal.tradeId !== trade.id || goal.selectedCandidateId !== candidate.id || trade.candidateId !== candidate.id || Date.parse(trade.createdAt) < Date.parse(connection.linkedAt)) return false;
      if (delivery.kind === "preview_expiring") {
        return delivery.payload.kind === "preview_expiring" && Date.parse(trade.previewExpiresAt) > Date.parse(now) && trade.previewExpiresAt === delivery.payload.previewExpiresAt;
      }
      return true;
    }
    if (!delivery.goalId || !delivery.candidateId || !delivery.decisionId) return false;
    const [goal, candidate, decision, latestDecision] = await Promise.all([
      this.getGoal(delivery.goalId, connection.ownerSessionHash),
      this.getCandidate(delivery.candidateId, connection.ownerSessionHash),
      this.getDecision(delivery.decisionId, connection.ownerSessionHash),
      this.getLatestDecision(delivery.candidateId, connection.ownerSessionHash),
    ]);
    return Boolean(goal && candidate && decision && latestDecision?.id === decision.id && decision.goalId === goal.id && decision.candidateId === candidate.id && Date.parse(decision.createdAt) >= Date.parse(connection.linkedAt));
  }

  async claimTelegramDeliveries(options: TelegramDeliveryClaimOptions = {}) {
    const now = options.now ?? new Date().toISOString();
    const limit = options.limit ?? 20;
    const leaseMs = options.leaseMs ?? 60_000;
    if (limit <= 0 || leaseMs <= 0) return [];
    return this.db.transaction(async (transaction) => {
      await transaction.update(telegramNotificationDeliveries).set({ status: "pending", leaseUntil: null, updatedAt: now }).where(and(eq(telegramNotificationDeliveries.status, "processing"), lte(telegramNotificationDeliveries.leaseUntil, now)));
      const rows = await transaction.select().from(telegramNotificationDeliveries).where(and(eq(telegramNotificationDeliveries.status, "pending"), lte(telegramNotificationDeliveries.nextAttemptAt, now))).orderBy(telegramNotificationDeliveries.nextAttemptAt).limit(limit).for("update", { skipLocked: true });
      const leaseUntil = new Date(Date.parse(now) + leaseMs).toISOString();
      const claimed: TelegramNotificationDelivery[] = [];
      for (const row of rows) {
        const updated = await transaction.update(telegramNotificationDeliveries).set({ status: "processing", attemptCount: row.attemptCount + 1, leaseUntil, updatedAt: now }).where(and(eq(telegramNotificationDeliveries.id, row.id), eq(telegramNotificationDeliveries.status, "pending"))).returning();
        if (updated[0]) claimed.push(telegramNotificationDeliveryFromRow(updated[0]));
      }
      return claimed;
    });
  }

  async markTelegramDeliverySent(id: string, telegramMessageId: string, at = new Date().toISOString()) {
    await this.db.update(telegramNotificationDeliveries).set({ status: "sent", telegramMessageId, leaseUntil: null, sentAt: at, updatedAt: at }).where(and(eq(telegramNotificationDeliveries.id, id), eq(telegramNotificationDeliveries.status, "processing")));
  }

  async rescheduleTelegramDelivery(id: string, nextAttemptAt: string, errorCode: string) {
    await this.db.update(telegramNotificationDeliveries).set({ status: "pending", nextAttemptAt, leaseUntil: null, lastErrorCode: errorCode, updatedAt: new Date().toISOString() }).where(and(eq(telegramNotificationDeliveries.id, id), eq(telegramNotificationDeliveries.status, "processing")));
  }

  async failTelegramDelivery(id: string, errorCode: string) {
    await this.db.update(telegramNotificationDeliveries).set({ status: "failed", leaseUntil: null, lastErrorCode: errorCode, updatedAt: new Date().toISOString() }).where(and(eq(telegramNotificationDeliveries.id, id), eq(telegramNotificationDeliveries.status, "processing")));
  }

  async cancelTelegramDelivery(id: string) {
    await this.db.update(telegramNotificationDeliveries).set({ status: "cancelled", leaseUntil: null, updatedAt: new Date().toISOString() }).where(and(eq(telegramNotificationDeliveries.id, id), inArray(telegramNotificationDeliveries.status, ["pending", "processing"])));
  }

  async cancelPendingTelegramDeliveries(connectionId: string) {
    await this.db.update(telegramNotificationDeliveries).set({ status: "cancelled", leaseUntil: null, updatedAt: new Date().toISOString() }).where(and(eq(telegramNotificationDeliveries.connectionId, connectionId), eq(telegramNotificationDeliveries.status, "pending")));
  }

  async cancelPendingTelegramPersonalizedDeliveries(connectionId: string) {
    await this.db.update(telegramNotificationDeliveries).set({ status: "cancelled", leaseUntil: null, updatedAt: new Date().toISOString() }).where(and(eq(telegramNotificationDeliveries.connectionId, connectionId), eq(telegramNotificationDeliveries.status, "pending"), inArray(telegramNotificationDeliveries.kind, telegramPersonalizedKinds)));
  }
}
