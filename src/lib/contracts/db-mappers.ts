import {
  CouncilDecisionSchema,
  CouncilReviewSchema,
  GoalSchema,
  GonkaInferenceSchema,
  ProtectionCandidateSchema,
  TradeSchema,
  type CouncilDecision,
  type CouncilReview,
  type Goal,
  type GonkaInference,
  type ProtectionCandidate,
  type Trade,
} from "./entities";
import {
  councilDecisions,
  councilReviews,
  goals,
  gonkaInferences,
  protectionCandidates,
  trades,
} from "@/lib/db/schema";

type GoalRow = typeof goals.$inferSelect;
type CandidateRow = typeof protectionCandidates.$inferSelect;
type InferenceRow = typeof gonkaInferences.$inferSelect;
type DecisionRow = typeof councilDecisions.$inferSelect;
type ReviewRow = typeof councilReviews.$inferSelect;
type TradeRow = typeof trades.$inferSelect;

export interface GoalReadReferences {
  parseInferenceId?: string | null;
  selectedCandidateId?: string | null;
  councilDecisionId?: string | null;
  tradeId?: string | null;
}

export function goalFromRow(row: GoalRow, references: GoalReadReferences = {}): Goal {
  return GoalSchema.parse({
    schemaVersion: row.schemaVersion,
    id: row.id,
    goalType: row.goalType,
    customGoalLabel: row.customGoalLabel,
    underlyingAsset: row.underlyingAsset,
    protectedValueUsd: row.protectedValueUsd,
    deadline: row.deadline,
    maxLossBps: row.maxLossBps,
    maxPremiumUsd: row.maxPremiumUsd,
    originalUserMessage: row.originalUserMessage,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    parseInferenceId: references.parseInferenceId ?? null,
    selectedCandidateId: references.selectedCandidateId ?? null,
    councilDecisionId: references.councilDecisionId ?? null,
    tradeId: references.tradeId ?? null,
  });
}

export function goalToRow(goal: Goal): typeof goals.$inferInsert {
  const value = GoalSchema.parse(goal);
  return {
    id: value.id,
    schemaVersion: value.schemaVersion,
    goalType: value.goalType,
    customGoalLabel: value.customGoalLabel,
    underlyingAsset: value.underlyingAsset,
    protectedValueUsd: value.protectedValueUsd,
    deadline: value.deadline,
    maxLossBps: value.maxLossBps,
    maxPremiumUsd: value.maxPremiumUsd,
    originalUserMessage: value.originalUserMessage,
    status: value.status,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export function candidateFromRow(row: CandidateRow): ProtectionCandidate {
  const { rejectionReasonsJson, protocolRawJson, scenariosJson, ...columns } = row;
  return ProtectionCandidateSchema.parse({
    ...columns,
    rejectionReasons: JSON.parse(rejectionReasonsJson),
    protocolRaw: JSON.parse(protocolRawJson),
    scenarios: JSON.parse(scenariosJson),
  });
}

export function candidateToRow(candidate: ProtectionCandidate): typeof protectionCandidates.$inferInsert {
  const value = ProtectionCandidateSchema.parse(candidate);
  const { rejectionReasons, protocolRaw, scenarios, ...columns } = value;
  return {
    ...columns,
    rejectionReasonsJson: JSON.stringify(rejectionReasons),
    protocolRawJson: JSON.stringify(protocolRaw),
    scenariosJson: JSON.stringify(scenarios),
  };
}

export function inferenceFromRow(row: InferenceRow): GonkaInference {
  const { rawResponseJson, ...publicColumns } = row;
  void rawResponseJson;
  return GonkaInferenceSchema.parse(publicColumns);
}

export function inferenceToRow(inference: GonkaInference, rawResponse?: unknown): typeof gonkaInferences.$inferInsert {
  const value = GonkaInferenceSchema.parse(inference);
  return {
    ...value,
    rawResponseJson: rawResponse === undefined ? null : JSON.stringify(rawResponse),
  };
}

export function reviewFromRow(row: ReviewRow): CouncilReview {
  const { concernsJson, requiredDisclosuresJson, ...columns } = row;
  return CouncilReviewSchema.parse({
    ...columns,
    concerns: JSON.parse(concernsJson),
    requiredDisclosures: JSON.parse(requiredDisclosuresJson),
  });
}

export function reviewToRow(review: CouncilReview): typeof councilReviews.$inferInsert {
  const value = CouncilReviewSchema.parse(review);
  const { concerns, requiredDisclosures, ...columns } = value;
  return {
    ...columns,
    concernsJson: JSON.stringify(concerns),
    requiredDisclosuresJson: JSON.stringify(requiredDisclosures),
  };
}

export function decisionFromRows(row: DecisionRow, reviewRows: ReviewRow[]): CouncilDecision {
  const { blockedReasonsJson, ...columns } = row;
  return CouncilDecisionSchema.parse({
    ...columns,
    blockedReasons: JSON.parse(blockedReasonsJson),
    reviews: reviewRows.map(reviewFromRow),
  });
}

export function decisionToRows(decision: CouncilDecision) {
  const value = CouncilDecisionSchema.parse(decision);
  const { blockedReasons, reviews, ...columns } = value;
  return {
    decision: {
      ...columns,
      blockedReasonsJson: JSON.stringify(blockedReasons),
    } satisfies typeof councilDecisions.$inferInsert,
    reviews: reviews.map(reviewToRow),
  };
}

export function tradeFromRow(row: TradeRow): Trade {
  return TradeSchema.parse(row);
}

export function tradeToRow(trade: Trade): typeof trades.$inferInsert {
  return TradeSchema.parse(trade);
}
