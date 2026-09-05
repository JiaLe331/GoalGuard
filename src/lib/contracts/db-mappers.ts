import {
  CouncilDecisionSchema,
  CouncilReviewSchema,
  GoalSchema,
  GonkaInferenceSchema,
  MarketSnapshotSchema,
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
  marketSnapshots,
  protectionCandidates,
  telegramConnections,
  telegramLinkTokens,
  telegramNotificationDeliveries,
  telegramNotificationPreferences,
  telegramWebhookUpdates,
  trades,
} from "@/lib/db/schema";
import {
  TelegramConnectionSchema,
  TelegramLinkTokenSchema,
  TelegramNotificationDeliverySchema,
  TelegramNotificationPreferencesSchema,
  TelegramWebhookUpdateSchema,
  type TelegramConnection,
  type TelegramLinkToken,
  type TelegramNotificationDelivery,
  type TelegramNotificationPreferences,
  type TelegramWebhookUpdate,
} from "@/lib/telegram/contracts";

type GoalRow = typeof goals.$inferSelect;
type CandidateRow = typeof protectionCandidates.$inferSelect;
type InferenceRow = typeof gonkaInferences.$inferSelect;
type DecisionRow = typeof councilDecisions.$inferSelect;
type ReviewRow = typeof councilReviews.$inferSelect;
type TradeRow = typeof trades.$inferSelect;
type MarketSnapshotRow = typeof marketSnapshots.$inferSelect;
type TelegramConnectionRow = typeof telegramConnections.$inferSelect;
type TelegramLinkTokenRow = typeof telegramLinkTokens.$inferSelect;
type TelegramNotificationPreferencesRow = typeof telegramNotificationPreferences.$inferSelect;
type TelegramNotificationDeliveryRow = typeof telegramNotificationDeliveries.$inferSelect;
type TelegramWebhookUpdateRow = typeof telegramWebhookUpdates.$inferSelect;

export interface GoalReadReferences {
  parseInferenceId?: string | null;
  selectedCandidateId?: string | null;
  councilDecisionId?: string | null;
  tradeId?: string | null;
}

const iso = (value: string | Date) => new Date(value).toISOString();

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
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    parseInferenceId: references.parseInferenceId ?? null,
    selectedCandidateId: references.selectedCandidateId ?? null,
    councilDecisionId: references.councilDecisionId ?? null,
    tradeId: references.tradeId ?? null,
  });
}

export function goalToRow(goal: Goal, ownerSessionHash: string): typeof goals.$inferInsert {
  const value = GoalSchema.parse(goal);
  return {
    id: value.id,
    ownerSessionHash,
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
  const { coverageMode, rejectionReasonsJson, protocolRawJson, scenariosJson, ...columns } = row;
  return ProtectionCandidateSchema.parse({
    ...columns,
    coverageMode,
    expiry: iso(columns.expiry), marketAsOf: iso(columns.marketAsOf), createdAt: iso(columns.createdAt), updatedAt: iso(columns.updatedAt),
    rejectionReasons: rejectionReasonsJson,
    protocolRaw: protocolRawJson,
    scenarios: scenariosJson,
  });
}

export function candidateToRow(candidate: ProtectionCandidate): typeof protectionCandidates.$inferInsert {
  const value = ProtectionCandidateSchema.parse(candidate);
  const { coverageMode, rejectionReasons, protocolRaw, scenarios, ...columns } = value;
  return {
    ...columns,
    coverageMode,
    rejectionReasonsJson: rejectionReasons,
    protocolRawJson: protocolRaw,
    scenariosJson: scenarios,
  };
}

export function inferenceFromRow(row: InferenceRow): GonkaInference {
  const { rawResponseJson, ...publicColumns } = row;
  void rawResponseJson;
  return GonkaInferenceSchema.parse({ ...publicColumns, createdAt: iso(publicColumns.createdAt), completedAt: publicColumns.completedAt ? iso(publicColumns.completedAt) : null });
}

export function inferenceToRow(inference: GonkaInference, rawResponse?: unknown): typeof gonkaInferences.$inferInsert {
  const value = GonkaInferenceSchema.parse(inference);
  return {
    ...value,
    rawResponseJson: rawResponse ?? null,
  };
}

export function reviewFromRow(row: ReviewRow): CouncilReview {
  const { concernsJson, requiredDisclosuresJson, ...columns } = row;
  return CouncilReviewSchema.parse({
    ...columns,
    createdAt: iso(columns.createdAt),
    concerns: concernsJson,
    requiredDisclosures: requiredDisclosuresJson,
  });
}

export function reviewToRow(review: CouncilReview): typeof councilReviews.$inferInsert {
  const value = CouncilReviewSchema.parse(review);
  const { concerns, requiredDisclosures, ...columns } = value;
  return {
    ...columns,
    concernsJson: concerns,
    requiredDisclosuresJson: requiredDisclosures,
  };
}

export function decisionFromRows(row: DecisionRow, reviewRows: ReviewRow[]): CouncilDecision {
  const { blockedReasonsJson, inputHash, ...columns } = row;
  void inputHash;
  return CouncilDecisionSchema.parse({
    ...columns,
    createdAt: iso(columns.createdAt),
    blockedReasons: blockedReasonsJson,
    reviews: reviewRows.map(reviewFromRow),
  });
}

export function decisionToRows(decision: CouncilDecision, inputHash: string) {
  const value = CouncilDecisionSchema.parse(decision);
  const { blockedReasons, reviews, ...columns } = value;
  return {
    decision: {
      ...columns,
      blockedReasonsJson: blockedReasons,
      inputHash,
    } satisfies typeof councilDecisions.$inferInsert,
    reviews: reviews.map(reviewToRow),
  };
}

export function tradeFromRow(row: TradeRow): Trade {
  const {
    expectedExecutionTarget, expectedCalldataHash, expectedValueBaseUnits,
    verificationDeadline, receiptBlockNumber, receiptConfirmations, ...publicColumns
  } = row;
  void expectedExecutionTarget;
  void expectedCalldataHash;
  void expectedValueBaseUnits;
  void verificationDeadline;
  void receiptBlockNumber;
  void receiptConfirmations;
  return TradeSchema.parse({
    ...publicColumns,
    previewExpiresAt: iso(publicColumns.previewExpiresAt), createdAt: iso(publicColumns.createdAt), updatedAt: iso(publicColumns.updatedAt),
    submittedAt: publicColumns.submittedAt ? iso(publicColumns.submittedAt) : null, confirmedAt: publicColumns.confirmedAt ? iso(publicColumns.confirmedAt) : null,
  });
}

export interface TradeExecutionExpectation {
  target: string;
  calldataHash: string;
  valueBaseUnits: string;
  verificationDeadline: string;
}

export function tradeToRow(trade: Trade, expectation: TradeExecutionExpectation): typeof trades.$inferInsert {
  return {
    ...TradeSchema.parse(trade),
    expectedExecutionTarget: expectation.target,
    expectedCalldataHash: expectation.calldataHash,
    expectedValueBaseUnits: expectation.valueBaseUnits,
    verificationDeadline: expectation.verificationDeadline,
  };
}

export function marketSnapshotFromRow(row: MarketSnapshotRow) {
  return MarketSnapshotSchema.parse({ ...row, capturedAt: iso(row.capturedAt) });
}

export function marketSnapshotToRow(snapshot: import("./entities").MarketSnapshot): typeof marketSnapshots.$inferInsert {
  return MarketSnapshotSchema.parse(snapshot);
}

export function telegramConnectionFromRow(row: TelegramConnectionRow): TelegramConnection {
  return TelegramConnectionSchema.parse({
    ...row,
    linkedAt: iso(row.linkedAt),
    lastInteractionAt: iso(row.lastInteractionAt),
    revokedAt: row.revokedAt ? iso(row.revokedAt) : null,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  });
}

export function telegramConnectionToRow(connection: TelegramConnection): typeof telegramConnections.$inferInsert {
  const value = TelegramConnectionSchema.parse(connection);
  return value;
}

export function telegramLinkTokenFromRow(row: TelegramLinkTokenRow): TelegramLinkToken {
  return TelegramLinkTokenSchema.parse({
    ...row,
    expiresAt: iso(row.expiresAt),
    consumedAt: row.consumedAt ? iso(row.consumedAt) : null,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  });
}

export function telegramLinkTokenToRow(token: TelegramLinkToken): typeof telegramLinkTokens.$inferInsert {
  const value = TelegramLinkTokenSchema.parse(token);
  return value;
}

export function telegramNotificationPreferencesFromRow(row: TelegramNotificationPreferencesRow): TelegramNotificationPreferences {
  return TelegramNotificationPreferencesSchema.parse({
    ...row,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  });
}

export function telegramNotificationPreferencesToRow(preferences: TelegramNotificationPreferences): typeof telegramNotificationPreferences.$inferInsert {
  const value = TelegramNotificationPreferencesSchema.parse(preferences);
  return value;
}

export function telegramNotificationDeliveryFromRow(row: TelegramNotificationDeliveryRow): TelegramNotificationDelivery {
  const { payloadJson, ...columns } = row;
  return TelegramNotificationDeliverySchema.parse({
    ...columns,
    payload: payloadJson,
    nextAttemptAt: iso(columns.nextAttemptAt),
    leaseUntil: columns.leaseUntil ? iso(columns.leaseUntil) : null,
    createdAt: iso(columns.createdAt),
    updatedAt: iso(columns.updatedAt),
    sentAt: columns.sentAt ? iso(columns.sentAt) : null,
  });
}

export function telegramNotificationDeliveryToRow(delivery: TelegramNotificationDelivery): typeof telegramNotificationDeliveries.$inferInsert {
  const value = TelegramNotificationDeliverySchema.parse(delivery);
  const { payload, ...columns } = value;
  return { ...columns, payloadJson: payload };
}

export function telegramWebhookUpdateFromRow(row: TelegramWebhookUpdateRow): TelegramWebhookUpdate {
  return TelegramWebhookUpdateSchema.parse({ ...row, processedAt: iso(row.processedAt) });
}

export function telegramWebhookUpdateToRow(update: TelegramWebhookUpdate): typeof telegramWebhookUpdates.$inferInsert {
  const value = TelegramWebhookUpdateSchema.parse(update);
  return value;
}
