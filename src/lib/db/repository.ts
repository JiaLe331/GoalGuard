import { and, desc, eq, inArray, lte } from "drizzle-orm";

import {
  candidateFromRow, candidateToRow, decisionFromRows, decisionToRows, goalFromRow, goalToRow,
  inferenceToRow, tradeFromRow, tradeToRow, type TradeExecutionExpectation,
} from "@/lib/contracts/db-mappers";
import type { CouncilDecision, Goal, GoalStatus, GonkaInference, ProtectionCandidate, Trade, TradeStatus, UUID } from "@/lib/contracts";

import { getDatabase, type GoalGuardDatabase } from "./client";
import { councilDecisions, councilReviews, goals, gonkaInferences, protectionCandidates, tradeRequestIdempotency, trades, workerHeartbeats } from "./schema";

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

export class PostgresGoalGuardRepository implements GoalGuardRepository {
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
      return tradeFromRow(inserted[0]!);
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
}
