import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

const utcTimestamp = (name: string) => timestamp(name, { withTimezone: true, mode: "string" });

export const goals = pgTable.withRLS("goals", {
  id: uuid("id").primaryKey(),
  schemaVersion: integer("schema_version").notNull().default(2),
  ownerSessionHash: varchar("owner_session_hash", { length: 64 }).notNull(),
  goalType: text("goal_type").notNull(),
  customGoalLabel: varchar("custom_goal_label", { length: 80 }),
  underlyingAsset: text("underlying_asset").notNull(),
  protectedValueUsd: text("protected_value_usd").notNull(),
  deadline: date("deadline", { mode: "string" }).notNull(),
  protectThroughAt: utcTimestamp("protect_through_at"),
  fundsNeededAt: utcTimestamp("funds_needed_at"),
  goalTimezone: text("goal_timezone"),
  timingConfirmed: boolean("timing_confirmed"),
  maxLossBps: integer("max_loss_bps").notNull(),
  maxPremiumUsd: text("max_premium_usd"),
  originalUserMessage: varchar("original_user_message", { length: 4000 }).notNull(),
  status: text("status").notNull(),
  createdAt: utcTimestamp("created_at").notNull(),
  updatedAt: utcTimestamp("updated_at").notNull(),
}, (table) => [
  check("goals_schema_version_check", sql`${table.schemaVersion} IN (1, 2)`),
  check("goals_max_loss_bps_check", sql`${table.maxLossBps} >= 0 AND ${table.maxLossBps} <= 9999`),
  check("goals_custom_label_check", sql`(${table.goalType} = 'custom' AND ${table.customGoalLabel} IS NOT NULL) OR (${table.goalType} <> 'custom' AND ${table.customGoalLabel} IS NULL)`),
  index("goals_owner_idx").on(table.ownerSessionHash),
  index("goals_status_updated_idx").on(table.status, table.updatedAt),
  index("goals_deadline_idx").on(table.deadline),
]);

export const protectionCandidates = pgTable.withRLS("protection_candidates", {
  id: uuid("id").primaryKey(),
  goalId: uuid("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  schemaVersion: integer("schema_version").notNull().default(2),
  source: text("source").notNull(), protocolOrderId: text("protocol_order_id"),
  underlyingAsset: text("underlying_asset").notNull(), optionType: text("option_type").notNull(),
  strikeUsd: text("strike_usd").notNull(), expiry: utcTimestamp("expiry").notNull(),
  settlementTokenAddress: varchar("settlement_token_address", { length: 42 }).notNull(),
  settlementTokenSymbol: varchar("settlement_token_symbol", { length: 16 }).notNull(),
  settlementTokenDecimals: integer("settlement_token_decimals").notNull(),
  premiumAmountBaseUnits: text("premium_amount_base_units").notNull(), premiumUsd: text("premium_usd").notNull(),
  quantityBaseUnits: text("quantity_base_units").notNull(), quantityUnderlying: text("quantity_underlying").notNull(),
  maxPremiumLossUsd: text("max_premium_loss_usd").notNull(), estimatedFloorUsd: text("estimated_floor_usd").notNull(),
  deadlineGapHours: integer("deadline_gap_hours").notNull(), goalCoverageBps: integer("goal_coverage_bps").notNull(), coverageMode: text("coverage_mode").notNull().default("full"),
  spotPriceUsd: text("spot_price_usd"), requiredQuantityBaseUnits: text("required_quantity_base_units"), requiredFloorUsd: text("required_floor_usd"),
  protectedFloorAtExpiryUsd: text("protected_floor_at_expiry_usd"), accessibleFloorByGoalDateUsd: text("accessible_floor_by_goal_date_usd"), expiryShortfallUsd: text("expiry_shortfall_usd"), goalDateShortfallUsd: text("goal_date_shortfall_usd"),
  protectionEndAt: utcTimestamp("protection_end_at"), settlementAvailableAt: utcTimestamp("settlement_available_at"), settlementConfirmationAllowanceSeconds: integer("settlement_confirmation_allowance_seconds"),
  settlementTrigger: text("settlement_trigger"), settlementTimingStatus: text("settlement_timing_status"), accessibilityBasis: text("accessibility_basis"), timingAccessible: boolean("timing_accessible"), goalAttainment: text("goal_attainment"),
  scoreVersion: text("score_version"), protectionScore: integer("protection_score"), scoreBreakdownJson: jsonb("score_breakdown_json").$type<unknown>(), policyVersion: text("policy_version"), expiryOverhangSeconds: integer("expiry_overhang_seconds"), settlementLeadSeconds: integer("settlement_lead_seconds"), effectiveBudgetUsd: text("effective_budget_usd"),
  availableQuantityBaseUnits: text("available_quantity_base_units"), status: text("status").notNull(),
  rejectionReasonsJson: jsonb("rejection_reasons_json").$type<unknown>().notNull().default([]),
  protocolRawJson: jsonb("protocol_raw_json").$type<unknown>().notNull(),
  scenariosJson: jsonb("scenarios_json").$type<unknown>().notNull(),
  marketAsOf: utcTimestamp("market_as_of").notNull(), createdAt: utcTimestamp("created_at").notNull(), updatedAt: utcTimestamp("updated_at").notNull(),
}, (table) => [
  check("candidates_schema_version_check", sql`${table.schemaVersion} IN (1, 2)`),
  check("candidates_token_decimals_check", sql`${table.settlementTokenDecimals} >= 0 AND ${table.settlementTokenDecimals} <= 255`),
  check("candidates_deadline_gap_check", sql`${table.deadlineGapHours} >= 0`),
  check("candidates_coverage_check", sql`${table.goalCoverageBps} >= 0 AND ${table.goalCoverageBps} <= 10000`),
  check("candidates_coverage_mode_check", sql`(${table.coverageMode} = 'full' AND ${table.goalCoverageBps} = 10000) OR (${table.coverageMode} = 'proportional_demo' AND ${table.goalCoverageBps} > 0 AND ${table.goalCoverageBps} < 10000)`),
  check("candidates_protection_score_check", sql`${table.protectionScore} IS NULL OR ${table.protectionScore} BETWEEN 0 AND 100`),
  check("candidates_settlement_allowance_check", sql`${table.settlementConfirmationAllowanceSeconds} IS NULL OR ${table.settlementConfirmationAllowanceSeconds} >= 0`),
  check("candidates_settlement_trigger_check", sql`${table.settlementTrigger} IS NULL OR ${table.settlementTrigger} = 'factory_callback'`),
  check("candidates_timing_status_check", sql`${table.settlementTimingStatus} IS NULL OR ${table.settlementTimingStatus} IN ('settlement_timing_not_verified', 'verified_accessible', 'verified_too_late')`),
  check("candidates_accessibility_basis_check", sql`${table.accessibilityBasis} IS NULL OR ${table.accessibilityBasis} IN ('unverified_factory_callback', 'verified_expiry_settlement')`),
  check("candidates_attainment_check", sql`${table.goalAttainment} IS NULL OR ${table.goalAttainment} IN ('meets_if_executed', 'shortfall', 'not_accessible_by_goal_date', 'settlement_timing_not_verified')`),
  check("candidates_unverified_timing_check", sql`${table.settlementTimingStatus} IS NULL OR ${table.settlementTimingStatus} <> 'settlement_timing_not_verified' OR (${table.settlementAvailableAt} IS NULL AND ${table.goalDateShortfallUsd} IS NULL AND ${table.accessibleFloorByGoalDateUsd} IS NULL AND ${table.timingAccessible} IS NULL AND ${table.protectionScore} IS NULL AND ${table.scoreBreakdownJson} IS NULL AND ${table.settlementConfirmationAllowanceSeconds} IS NULL AND ${table.settlementLeadSeconds} IS NULL)`),
  index("candidates_goal_status_idx").on(table.goalId, table.status), index("candidates_expiry_idx").on(table.expiry),
  index("candidates_source_order_idx").on(table.source, table.protocolOrderId),
  uniqueIndex("candidates_one_selected_per_goal_idx").on(table.goalId).where(sql`${table.status} = 'selected'`),
]);

export const gonkaInferences = pgTable.withRLS("gonka_inferences", {
  id: uuid("id").primaryKey(), goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
  candidateId: uuid("candidate_id").references(() => protectionCandidates.id, { onDelete: "set null" }),
  schemaVersion: integer("schema_version").notNull().default(1), purpose: text("purpose").notNull(), provider: text("provider").notNull(),
  model: text("model").notNull(), requestId: text("request_id"), status: text("status").notNull(), inputHash: varchar("input_hash", { length: 64 }).notNull(),
  latencyMs: integer("latency_ms"), errorCode: text("error_code"), errorMessage: text("error_message"), rawResponseJson: jsonb("raw_response_json").$type<unknown>(),
  createdAt: utcTimestamp("created_at").notNull(), completedAt: utcTimestamp("completed_at"),
}, (table) => [
  check("inferences_schema_version_check", sql`${table.schemaVersion} = 1`), check("inferences_provider_check", sql`${table.provider} = 'gonka'`),
  check("inferences_latency_check", sql`${table.latencyMs} IS NULL OR ${table.latencyMs} >= 0`),
  index("inferences_goal_purpose_created_idx").on(table.goalId, table.purpose, table.createdAt), index("inferences_candidate_purpose_idx").on(table.candidateId, table.purpose),
  uniqueIndex("inferences_request_id_idx").on(table.requestId).where(sql`${table.requestId} IS NOT NULL`),
]);

export const councilDecisions = pgTable.withRLS("council_decisions", {
  id: uuid("id").primaryKey(), goalId: uuid("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  candidateId: uuid("candidate_id").notNull().references(() => protectionCandidates.id, { onDelete: "cascade" }), schemaVersion: integer("schema_version").notNull().default(1),
  attempt: integer("attempt").notNull(), status: text("status").notNull(), rulesetVersion: varchar("ruleset_version", { length: 32 }).notNull(),
  approvedReviewCount: integer("approved_review_count").notNull(), rejectedReviewCount: integer("rejected_review_count").notNull(), uncertainReviewCount: integer("uncertain_review_count").notNull(),
  blockedReasonsJson: jsonb("blocked_reasons_json").$type<unknown>().notNull().default([]), inputHash: varchar("input_hash", { length: 64 }).notNull(), createdAt: utcTimestamp("created_at").notNull(),
}, (table) => [
  check("decisions_schema_version_check", sql`${table.schemaVersion} = 1`), check("decisions_attempt_check", sql`${table.attempt} >= 1`),
  check("decisions_counts_check", sql`${table.approvedReviewCount} >= 0 AND ${table.approvedReviewCount} <= 3 AND ${table.rejectedReviewCount} >= 0 AND ${table.rejectedReviewCount} <= 3 AND ${table.uncertainReviewCount} >= 0 AND ${table.uncertainReviewCount} <= 3`),
  uniqueIndex("decisions_candidate_attempt_idx").on(table.candidateId, table.attempt), index("decisions_goal_created_idx").on(table.goalId, table.createdAt), index("decisions_candidate_created_idx").on(table.candidateId, table.createdAt),
]);

export const councilReviews = pgTable.withRLS("council_reviews", {
  id: uuid("id").primaryKey(), decisionId: uuid("decision_id").notNull().references(() => councilDecisions.id, { onDelete: "cascade" }),
  inferenceId: uuid("inference_id").notNull().references(() => gonkaInferences.id), schemaVersion: integer("schema_version").notNull().default(1),
  role: text("role").notNull(), model: text("model").notNull(), requestId: text("request_id").notNull(), verdict: text("verdict").notNull(), confidenceBps: integer("confidence_bps").notNull(),
  summary: varchar("summary", { length: 1000 }).notNull(), concernsJson: jsonb("concerns_json").$type<unknown>().notNull().default([]),
  requiredDisclosuresJson: jsonb("required_disclosures_json").$type<unknown>().notNull().default([]), createdAt: utcTimestamp("created_at").notNull(),
}, (table) => [
  check("reviews_schema_version_check", sql`${table.schemaVersion} = 1`), check("reviews_confidence_check", sql`${table.confidenceBps} >= 0 AND ${table.confidenceBps} <= 10000`),
  uniqueIndex("reviews_decision_role_idx").on(table.decisionId, table.role), uniqueIndex("reviews_inference_idx").on(table.inferenceId), index("reviews_decision_idx").on(table.decisionId),
]);

export const trades = pgTable.withRLS("trades", {
  id: uuid("id").primaryKey(), goalId: uuid("goal_id").notNull().references(() => goals.id, { onDelete: "restrict" }),
  candidateId: uuid("candidate_id").notNull().references(() => protectionCandidates.id, { onDelete: "restrict" }), councilDecisionId: uuid("council_decision_id").notNull().references(() => councilDecisions.id, { onDelete: "restrict" }),
  schemaVersion: integer("schema_version").notNull().default(1), idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(), walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  chainId: integer("chain_id").notNull(), status: text("status").notNull(), quoteFingerprint: varchar("quote_fingerprint", { length: 64 }).notNull(), previewExpiresAt: utcTimestamp("preview_expires_at").notNull(),
  settlementTokenAddress: varchar("settlement_token_address", { length: 42 }).notNull(), premiumAmountBaseUnits: text("premium_amount_base_units").notNull(), premiumUsd: text("premium_usd").notNull(),
  txHash: varchar("tx_hash", { length: 66 }), protocolPositionId: text("protocol_position_id"), failureCode: text("failure_code"), failureMessage: text("failure_message"),
  expectedExecutionTarget: varchar("expected_execution_target", { length: 42 }).notNull(), expectedCalldataHash: varchar("expected_calldata_hash", { length: 64 }).notNull(), expectedValueBaseUnits: text("expected_value_base_units").notNull().default("0"),
  verificationDeadline: utcTimestamp("verification_deadline").notNull(), receiptBlockNumber: text("receipt_block_number"), receiptConfirmations: integer("receipt_confirmations"),
  createdAt: utcTimestamp("created_at").notNull(), updatedAt: utcTimestamp("updated_at").notNull(), submittedAt: utcTimestamp("submitted_at"), confirmedAt: utcTimestamp("confirmed_at"),
}, (table) => [
  check("trades_schema_version_check", sql`${table.schemaVersion} = 1`), check("trades_chain_id_check", sql`${table.chainId} = 8453`), check("trades_idempotency_length_check", sql`length(${table.idempotencyKey}) BETWEEN 16 AND 128`),
  uniqueIndex("trades_idempotency_key_idx").on(table.idempotencyKey), uniqueIndex("trades_tx_hash_idx").on(table.txHash).where(sql`${table.txHash} IS NOT NULL`),
  index("trades_goal_created_idx").on(table.goalId, table.createdAt), index("trades_wallet_created_idx").on(table.walletAddress, table.createdAt), index("trades_status_updated_idx").on(table.status, table.updatedAt),
]);

export const tradeRequestIdempotency = pgTable.withRLS("trade_request_idempotency", {
  key: varchar("key", { length: 128 }).primaryKey(),
  operation: text("operation").notNull(),
  ownerSessionHash: varchar("owner_session_hash", { length: 64 }).notNull(),
  requestHash: varchar("request_hash", { length: 64 }).notNull(),
  status: text("status").notNull(),
  tradeId: uuid("trade_id").references(() => trades.id, { onDelete: "restrict" }),
  responseJson: jsonb("response_json").$type<unknown>(),
  createdAt: utcTimestamp("created_at").notNull(),
  updatedAt: utcTimestamp("updated_at").notNull(),
}, (table) => [
  check("trade_idempotency_key_length_check", sql`length(${table.key}) BETWEEN 16 AND 128`),
  check("trade_idempotency_operation_check", sql`${table.operation} IN ('preview', 'execute', 'submission')`),
  check("trade_idempotency_status_check", sql`${table.status} IN ('in_progress', 'completed')`),
  index("trade_idempotency_owner_created_idx").on(table.ownerSessionHash, table.createdAt),
  index("trade_idempotency_trade_idx").on(table.tradeId),
]);

export const workerHeartbeats = pgTable.withRLS("worker_heartbeats", {
  workerName: text("worker_name").primaryKey(), instanceId: uuid("instance_id").notNull(), lastSeenAt: utcTimestamp("last_seen_at").notNull(),
});
