import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

const utcTimestamp = (name: string) => timestamp(name, { withTimezone: true, mode: "string" });

export const goals = pgTable.withRLS("goals", {
  id: uuid("id").primaryKey(),
  schemaVersion: integer("schema_version").notNull().default(1),
  ownerSessionHash: varchar("owner_session_hash", { length: 64 }).notNull(),
  goalType: text("goal_type").notNull(),
  customGoalLabel: varchar("custom_goal_label", { length: 80 }),
  underlyingAsset: text("underlying_asset").notNull(),
  protectedValueUsd: text("protected_value_usd").notNull(),
  deadline: date("deadline", { mode: "string" }).notNull(),
  maxLossBps: integer("max_loss_bps").notNull(),
  maxPremiumUsd: text("max_premium_usd"),
  originalUserMessage: varchar("original_user_message", { length: 4000 }).notNull(),
  status: text("status").notNull(),
  createdAt: utcTimestamp("created_at").notNull(),
  updatedAt: utcTimestamp("updated_at").notNull(),
}, (table) => [
  check("goals_schema_version_check", sql`${table.schemaVersion} = 1`),
  check("goals_max_loss_bps_check", sql`${table.maxLossBps} >= 0 AND ${table.maxLossBps} <= 9999`),
  check("goals_custom_label_check", sql`(${table.goalType} = 'custom' AND ${table.customGoalLabel} IS NOT NULL) OR (${table.goalType} <> 'custom' AND ${table.customGoalLabel} IS NULL)`),
  index("goals_owner_idx").on(table.ownerSessionHash),
  index("goals_status_updated_idx").on(table.status, table.updatedAt),
  index("goals_deadline_idx").on(table.deadline),
]);

export const protectionCandidates = pgTable.withRLS("protection_candidates", {
  id: uuid("id").primaryKey(),
  goalId: uuid("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  schemaVersion: integer("schema_version").notNull().default(1),
  source: text("source").notNull(), protocolOrderId: text("protocol_order_id"),
  underlyingAsset: text("underlying_asset").notNull(), optionType: text("option_type").notNull(),
  settlementType: text("settlement_type").notNull(),
  impliedVolatilityBps: integer("implied_volatility_bps"),
  strikeUsd: text("strike_usd").notNull(), expiry: utcTimestamp("expiry").notNull(),
  settlementTokenAddress: varchar("settlement_token_address", { length: 42 }).notNull(),
  settlementTokenSymbol: varchar("settlement_token_symbol", { length: 16 }).notNull(),
  settlementTokenDecimals: integer("settlement_token_decimals").notNull(),
  premiumAmountBaseUnits: text("premium_amount_base_units").notNull(), premiumUsd: text("premium_usd").notNull(),
  quantityBaseUnits: text("quantity_base_units").notNull(), quantityUnderlying: text("quantity_underlying").notNull(),
  maxPremiumLossUsd: text("max_premium_loss_usd").notNull(), estimatedFloorUsd: text("estimated_floor_usd").notNull(),
  deadlineGapHours: integer("deadline_gap_hours").notNull(), goalCoverageBps: integer("goal_coverage_bps").notNull(), coverageMode: text("coverage_mode").notNull().default("full"),
  availableQuantityBaseUnits: text("available_quantity_base_units"), status: text("status").notNull(),
  rejectionReasonsJson: jsonb("rejection_reasons_json").$type<unknown>().notNull().default([]),
  protocolRawJson: jsonb("protocol_raw_json").$type<unknown>().notNull(),
  scenariosJson: jsonb("scenarios_json").$type<unknown>().notNull(),
  marketAsOf: utcTimestamp("market_as_of").notNull(), createdAt: utcTimestamp("created_at").notNull(), updatedAt: utcTimestamp("updated_at").notNull(),
}, (table) => [
  check("candidates_schema_version_check", sql`${table.schemaVersion} = 1`),
  check("candidates_settlement_type_check", sql`${table.settlementType} IN ('cash', 'physical')`),
  check("candidates_implied_volatility_check", sql`${table.impliedVolatilityBps} IS NULL OR ${table.impliedVolatilityBps} >= 0`),
  check("candidates_token_decimals_check", sql`${table.settlementTokenDecimals} >= 0 AND ${table.settlementTokenDecimals} <= 255`),
  check("candidates_deadline_gap_check", sql`${table.deadlineGapHours} >= 0`),
  check("candidates_coverage_check", sql`${table.goalCoverageBps} >= 0 AND ${table.goalCoverageBps} <= 10000`),
  check("candidates_coverage_mode_check", sql`(${table.coverageMode} = 'full' AND ${table.goalCoverageBps} = 10000) OR (${table.coverageMode} = 'proportional_demo' AND ${table.goalCoverageBps} > 0 AND ${table.goalCoverageBps} < 10000)`),
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

export const telegramConnections = pgTable.withRLS("telegram_connections", {
  id: uuid("id").primaryKey(),
  ownerSessionHash: varchar("owner_session_hash", { length: 64 }).notNull(),
  telegramUserId: varchar("telegram_user_id", { length: 32 }).notNull(),
  telegramChatId: varchar("telegram_chat_id", { length: 32 }).notNull(),
  status: text("status").notNull(),
  timezone: varchar("timezone", { length: 100 }).notNull().default("UTC"),
  linkedAt: utcTimestamp("linked_at").notNull(),
  lastInteractionAt: utcTimestamp("last_interaction_at").notNull(),
  revokedAt: utcTimestamp("revoked_at"),
  createdAt: utcTimestamp("created_at").notNull(),
  updatedAt: utcTimestamp("updated_at").notNull(),
}, (table) => [
  check("telegram_connections_status_check", sql`${table.status} IN ('connected', 'revoked', 'blocked')`),
  check("telegram_connections_owner_hash_check", sql`${table.ownerSessionHash} ~ '^[0-9a-f]{64}$'`),
  check("telegram_connections_user_id_check", sql`${table.telegramUserId} ~ '^[0-9]{1,32}$'`),
  check("telegram_connections_chat_id_check", sql`${table.telegramChatId} ~ '^[0-9]{1,32}$'`),
  check("telegram_connections_revoked_at_check", sql`(${table.status} = 'connected' AND ${table.revokedAt} IS NULL) OR (${table.status} IN ('revoked', 'blocked') AND ${table.revokedAt} IS NOT NULL)`),
  index("telegram_connections_owner_idx").on(table.ownerSessionHash),
  index("telegram_connections_chat_idx").on(table.telegramChatId),
  index("telegram_connections_user_idx").on(table.telegramUserId),
  uniqueIndex("telegram_connections_owner_active_idx").on(table.ownerSessionHash).where(sql`${table.status} = 'connected'`),
  uniqueIndex("telegram_connections_chat_active_idx").on(table.telegramChatId).where(sql`${table.status} = 'connected'`),
  uniqueIndex("telegram_connections_user_active_idx").on(table.telegramUserId).where(sql`${table.status} = 'connected'`),
]);

export const telegramLinkTokens = pgTable.withRLS("telegram_link_tokens", {
  id: uuid("id").primaryKey(),
  ownerSessionHash: varchar("owner_session_hash", { length: 64 }).notNull(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull(),
  timezone: varchar("timezone", { length: 100 }).notNull().default("UTC"),
  status: text("status").notNull(),
  expiresAt: utcTimestamp("expires_at").notNull(),
  consumedAt: utcTimestamp("consumed_at"),
  createdAt: utcTimestamp("created_at").notNull(),
  updatedAt: utcTimestamp("updated_at").notNull(),
}, (table) => [
  check("telegram_link_tokens_status_check", sql`${table.status} IN ('pending', 'consumed', 'superseded', 'expired')`),
  check("telegram_link_tokens_owner_hash_check", sql`${table.ownerSessionHash} ~ '^[0-9a-f]{64}$'`),
  check("telegram_link_tokens_hash_check", sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`),
  check("telegram_link_tokens_consumed_at_check", sql`(${table.status} = 'consumed' AND ${table.consumedAt} IS NOT NULL) OR (${table.status} <> 'consumed' AND ${table.consumedAt} IS NULL)`),
  uniqueIndex("telegram_link_tokens_hash_idx").on(table.tokenHash),
  index("telegram_link_tokens_owner_status_idx").on(table.ownerSessionHash, table.status),
  index("telegram_link_tokens_expiry_idx").on(table.status, table.expiresAt),
]);

export const telegramNotificationPreferences = pgTable.withRLS("telegram_notification_preferences", {
  connectionId: uuid("connection_id").primaryKey().references(() => telegramConnections.id, { onDelete: "cascade" }),
  councilResults: boolean("council_results").notNull().default(true),
  previewReady: boolean("preview_ready").notNull().default(true),
  previewExpiring: boolean("preview_expiring").notNull().default(false),
  goalDeadlines: boolean("goal_deadlines").notNull().default(true),
  optionExpiry: boolean("option_expiry").notNull().default(true),
  createdAt: utcTimestamp("created_at").notNull(),
  updatedAt: utcTimestamp("updated_at").notNull(),
});

export const telegramNotificationDeliveries = pgTable.withRLS("telegram_notification_deliveries", {
  id: uuid("id").primaryKey(),
  connectionId: uuid("connection_id").references(() => telegramConnections.id, { onDelete: "set null" }),
  telegramChatId: varchar("telegram_chat_id", { length: 32 }).notNull(),
  kind: text("kind").notNull(),
  goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
  candidateId: uuid("candidate_id").references(() => protectionCandidates.id, { onDelete: "set null" }),
  decisionId: uuid("decision_id").references(() => councilDecisions.id, { onDelete: "set null" }),
  tradeId: uuid("trade_id").references(() => trades.id, { onDelete: "set null" }),
  dedupeKey: varchar("dedupe_key", { length: 160 }).notNull(),
  payloadJson: jsonb("payload_json").$type<unknown>().notNull(),
  status: text("status").notNull(),
  attemptCount: integer("attempt_count").notNull().default(0),
  nextAttemptAt: utcTimestamp("next_attempt_at").notNull(),
  leaseUntil: utcTimestamp("lease_until"),
  telegramMessageId: varchar("telegram_message_id", { length: 32 }),
  lastErrorCode: varchar("last_error_code", { length: 64 }),
  createdAt: utcTimestamp("created_at").notNull(),
  updatedAt: utcTimestamp("updated_at").notNull(),
  sentAt: utcTimestamp("sent_at"),
}, (table) => [
  check("telegram_deliveries_chat_id_check", sql`${table.telegramChatId} ~ '^[0-9]{1,32}$'`),
  check("telegram_deliveries_kind_check", sql`${table.kind} IN ('connection_receipt', 'command_reply', 'unlink_confirmation', 'council_approved', 'council_disputed', 'council_blocked', 'preview_ready', 'preview_expiring', 'goal_deadline', 'option_expiry')`),
  check("telegram_deliveries_status_check", sql`${table.status} IN ('pending', 'processing', 'sent', 'failed', 'cancelled')`),
  check("telegram_deliveries_attempt_count_check", sql`${table.attemptCount} >= 0`),
  check("telegram_deliveries_lease_check", sql`${table.status} <> 'processing' OR ${table.leaseUntil} IS NOT NULL`),
  uniqueIndex("telegram_deliveries_dedupe_key_idx").on(table.dedupeKey),
  index("telegram_deliveries_due_idx").on(table.status, table.nextAttemptAt),
  index("telegram_deliveries_connection_status_idx").on(table.connectionId, table.status),
  index("telegram_deliveries_goal_idx").on(table.goalId, table.status),
]);

export const telegramWebhookUpdates = pgTable.withRLS("telegram_webhook_updates", {
  updateId: varchar("update_id", { length: 32 }).primaryKey(),
  processedAt: utcTimestamp("processed_at").notNull(),
}, (table) => [
  check("telegram_webhook_updates_id_check", sql`${table.updateId} ~ '^[0-9]{1,32}$'`),
  index("telegram_webhook_updates_processed_idx").on(table.processedAt),
]);

export const marketSnapshots = pgTable.withRLS("market_snapshots", {
  capturedAt: utcTimestamp("captured_at").primaryKey(),
  ethSpotUsd: text("eth_spot_usd").notNull(),
  optionCount: integer("option_count").notNull(),
  medianIvBps: integer("median_iv_bps"),
  costPer100Usd30d: text("cost_per_100_usd_30d"),
}, (table) => [
  check("market_snapshots_option_count_check", sql`${table.optionCount} >= 0`),
  check("market_snapshots_iv_check", sql`${table.medianIvBps} IS NULL OR ${table.medianIvBps} >= 0`),
  index("market_snapshots_captured_at_idx").on(table.capturedAt),
]);
