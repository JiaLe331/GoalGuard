import { and, desc, eq, inArray } from "drizzle-orm";
import type { NodeSQLiteDatabase } from "drizzle-orm/node-sqlite";

import {
  candidateFromRow,
  candidateToRow,
  decisionFromRows,
  decisionToRows,
  goalFromRow,
  goalToRow,
  inferenceToRow,
  tradeFromRow,
  tradeToRow,
} from "@/lib/contracts/db-mappers";
import type {
  CouncilDecision,
  Goal,
  GoalStatus,
  GonkaInference,
  ProtectionCandidate,
  Trade,
  TradeStatus,
  UUID,
} from "@/lib/contracts";

import { getDatabase } from "./client";
import {
  councilDecisions,
  councilReviews,
  goals,
  gonkaInferences,
  protectionCandidates,
  trades,
} from "./schema";

export interface GoalGuardRepository {
  createGoal(goal: Goal): Promise<Goal>;
  getGoal(id: UUID): Promise<Goal | null>;
  updateGoalStatus(id: UUID, status: GoalStatus): Promise<Goal>;
  replaceCandidates(goalId: UUID, candidates: ProtectionCandidate[]): Promise<void>;
  getCandidate(id: UUID): Promise<ProtectionCandidate | null>;
  saveInference(inference: GonkaInference): Promise<void>;
  saveDecision(decision: CouncilDecision): Promise<void>;
  getLatestDecision(candidateId: UUID): Promise<CouncilDecision | null>;
  createTrade(trade: Trade): Promise<Trade>;
  getTrade(id: UUID): Promise<Trade | null>;
  transitionTrade(id: UUID, from: TradeStatus[], to: TradeStatus): Promise<Trade>;
}

const goalTransitions: Record<GoalStatus, GoalStatus[]> = {
  draft: ["searching", "failed"],
  searching: ["reviewing", "failed"],
  reviewing: ["ready", "failed"],
  ready: ["protected", "failed"],
  protected: [],
  failed: [],
};

const tradeTransitions: Record<TradeStatus, TradeStatus[]> = {
  previewed: ["awaiting_signature", "cancelled", "stale"],
  awaiting_signature: ["submitted", "cancelled", "stale"],
  submitted: ["confirmed", "failed"],
  confirmed: [],
  failed: [],
  cancelled: [],
  stale: [],
};

export class RepositoryConflictError extends Error {}
export class RepositoryNotFoundError extends Error {}

export class SqliteGoalGuardRepository implements GoalGuardRepository {
  constructor(private readonly db: NodeSQLiteDatabase = getDatabase().db) {}

  async createGoal(goal: Goal) {
    this.db.insert(goals).values(goalToRow(goal)).run();
    return (await this.getGoal(goal.id))!;
  }

  async getGoal(id: UUID) {
    const row = this.db.select().from(goals).where(eq(goals.id, id)).get();
    if (!row) return null;

    const parseInference = this.db.select({ id: gonkaInferences.id }).from(gonkaInferences)
      .where(and(eq(gonkaInferences.goalId, id), eq(gonkaInferences.purpose, "goal_parse")))
      .orderBy(desc(gonkaInferences.createdAt)).get();
    const selectedCandidate = this.db.select({ id: protectionCandidates.id }).from(protectionCandidates)
      .where(and(eq(protectionCandidates.goalId, id), eq(protectionCandidates.status, "selected"))).get();
    const decision = this.db.select({ id: councilDecisions.id }).from(councilDecisions)
      .where(eq(councilDecisions.goalId, id)).orderBy(desc(councilDecisions.createdAt)).get();
    const trade = this.db.select({ id: trades.id }).from(trades)
      .where(eq(trades.goalId, id)).orderBy(desc(trades.createdAt)).get();

    return goalFromRow(row, {
      parseInferenceId: parseInference?.id ?? null,
      selectedCandidateId: selectedCandidate?.id ?? null,
      councilDecisionId: decision?.id ?? null,
      tradeId: trade?.id ?? null,
    });
  }

  async updateGoalStatus(id: UUID, status: GoalStatus) {
    const current = await this.getGoal(id);
    if (!current) throw new RepositoryNotFoundError(`Goal ${id} was not found.`);
    if (current.status !== status && !goalTransitions[current.status].includes(status)) {
      throw new RepositoryConflictError(`Goal cannot transition from ${current.status} to ${status}.`);
    }

    this.db.update(goals).set({ status, updatedAt: new Date().toISOString() }).where(eq(goals.id, id)).run();
    return (await this.getGoal(id))!;
  }

  async replaceCandidates(goalId: UUID, candidates: ProtectionCandidate[]) {
    if (candidates.some((candidate) => candidate.goalId !== goalId)) {
      throw new RepositoryConflictError("Every candidate must belong to the requested goal.");
    }
    if (candidates.filter(({ status }) => status === "selected").length > 1) {
      throw new RepositoryConflictError("At most one candidate may be selected.");
    }

    this.db.transaction((transaction) => {
      transaction.update(protectionCandidates).set({ status: "stale", updatedAt: new Date().toISOString() })
        .where(eq(protectionCandidates.goalId, goalId)).run();
      for (const candidate of candidates) {
        transaction.insert(protectionCandidates).values(candidateToRow(candidate)).onConflictDoUpdate({
          target: protectionCandidates.id,
          set: candidateToRow(candidate),
        }).run();
      }
    });
  }

  async getCandidate(id: UUID) {
    const row = this.db.select().from(protectionCandidates).where(eq(protectionCandidates.id, id)).get();
    return row ? candidateFromRow(row) : null;
  }

  async saveInference(inference: GonkaInference) {
    this.db.insert(gonkaInferences).values(inferenceToRow(inference)).run();
  }

  async saveDecision(decision: CouncilDecision) {
    const rows = decisionToRows(decision);
    this.db.transaction((transaction) => {
      transaction.insert(councilDecisions).values(rows.decision).run();
      transaction.insert(councilReviews).values(rows.reviews).run();
      if (decision.status === "approved") {
        transaction.update(goals).set({ status: "ready", updatedAt: new Date().toISOString() })
          .where(eq(goals.id, decision.goalId)).run();
      }
    });
  }

  async getLatestDecision(candidateId: UUID) {
    const row = this.db.select().from(councilDecisions).where(eq(councilDecisions.candidateId, candidateId))
      .orderBy(desc(councilDecisions.attempt)).get();
    if (!row) return null;
    const reviews = this.db.select().from(councilReviews).where(eq(councilReviews.decisionId, row.id)).all();
    return decisionFromRows(row, reviews);
  }

  async createTrade(trade: Trade) {
    const existing = this.db.select().from(trades).where(eq(trades.idempotencyKey, trade.idempotencyKey)).get();
    if (existing) {
      const saved = tradeFromRow(existing);
      const sameRequest = saved.goalId === trade.goalId && saved.candidateId === trade.candidateId
        && saved.councilDecisionId === trade.councilDecisionId && saved.walletAddress.toLowerCase() === trade.walletAddress.toLowerCase()
        && saved.quoteFingerprint === trade.quoteFingerprint;
      if (!sameRequest) throw new RepositoryConflictError("The idempotency key is already associated with another trade.");
      return saved;
    }
    this.db.insert(trades).values(tradeToRow(trade)).run();
    return (await this.getTrade(trade.id))!;
  }

  async getTrade(id: UUID) {
    const row = this.db.select().from(trades).where(eq(trades.id, id)).get();
    return row ? tradeFromRow(row) : null;
  }

  async transitionTrade(id: UUID, from: TradeStatus[], to: TradeStatus) {
    const current = await this.getTrade(id);
    if (!current) throw new RepositoryNotFoundError(`Trade ${id} was not found.`);
    if (!from.includes(current.status) || !tradeTransitions[current.status].includes(to)) {
      throw new RepositoryConflictError(`Trade cannot transition from ${current.status} to ${to}.`);
    }

    const result = this.db.update(trades).set({ status: to, updatedAt: new Date().toISOString() })
      .where(and(eq(trades.id, id), inArray(trades.status, from))).run();
    if (result.changes !== 1) throw new RepositoryConflictError("Trade changed during the transition.");
    return (await this.getTrade(id))!;
  }
}
