CREATE TABLE `council_decisions` (
	`id` text PRIMARY KEY,
	`goal_id` text NOT NULL,
	`candidate_id` text NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`attempt` integer NOT NULL,
	`status` text NOT NULL,
	`ruleset_version` text NOT NULL,
	`approved_review_count` integer NOT NULL,
	`rejected_review_count` integer NOT NULL,
	`uncertain_review_count` integer NOT NULL,
	`blocked_reasons_json` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT `fk_council_decisions_goal_id_goals_id_fk` FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_council_decisions_candidate_id_protection_candidates_id_fk` FOREIGN KEY (`candidate_id`) REFERENCES `protection_candidates`(`id`) ON DELETE CASCADE,
	CONSTRAINT "decisions_schema_version_check" CHECK("schema_version" = 1),
	CONSTRAINT "decisions_attempt_check" CHECK("attempt" >= 1),
	CONSTRAINT "decisions_counts_check" CHECK("approved_review_count" >= 0 AND "approved_review_count" <= 3 AND "rejected_review_count" >= 0 AND "rejected_review_count" <= 3 AND "uncertain_review_count" >= 0 AND "uncertain_review_count" <= 3)
);
--> statement-breakpoint
CREATE TABLE `council_reviews` (
	`id` text PRIMARY KEY,
	`decision_id` text NOT NULL,
	`inference_id` text NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`role` text NOT NULL,
	`model` text NOT NULL,
	`request_id` text NOT NULL,
	`verdict` text NOT NULL,
	`confidence_bps` integer NOT NULL,
	`summary` text NOT NULL,
	`concerns_json` text DEFAULT '[]' NOT NULL,
	`required_disclosures_json` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT `fk_council_reviews_decision_id_council_decisions_id_fk` FOREIGN KEY (`decision_id`) REFERENCES `council_decisions`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_council_reviews_inference_id_gonka_inferences_id_fk` FOREIGN KEY (`inference_id`) REFERENCES `gonka_inferences`(`id`),
	CONSTRAINT "reviews_schema_version_check" CHECK("schema_version" = 1),
	CONSTRAINT "reviews_confidence_check" CHECK("confidence_bps" >= 0 AND "confidence_bps" <= 10000)
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`goal_type` text NOT NULL,
	`custom_goal_label` text,
	`underlying_asset` text NOT NULL,
	`protected_value_usd` text NOT NULL,
	`deadline` text NOT NULL,
	`max_loss_bps` integer NOT NULL,
	`max_premium_usd` text,
	`original_user_message` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "goals_schema_version_check" CHECK("schema_version" = 1),
	CONSTRAINT "goals_max_loss_bps_check" CHECK("max_loss_bps" >= 0 AND "max_loss_bps" <= 9999),
	CONSTRAINT "goals_custom_label_check" CHECK(("goal_type" = 'custom' AND "custom_goal_label" IS NOT NULL) OR ("goal_type" <> 'custom' AND "custom_goal_label" IS NULL))
);
--> statement-breakpoint
CREATE TABLE `gonka_inferences` (
	`id` text PRIMARY KEY,
	`goal_id` text,
	`candidate_id` text,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`purpose` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`request_id` text,
	`status` text NOT NULL,
	`input_hash` text NOT NULL,
	`latency_ms` integer,
	`error_code` text,
	`error_message` text,
	`raw_response_json` text,
	`created_at` text NOT NULL,
	`completed_at` text,
	CONSTRAINT `fk_gonka_inferences_goal_id_goals_id_fk` FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_gonka_inferences_candidate_id_protection_candidates_id_fk` FOREIGN KEY (`candidate_id`) REFERENCES `protection_candidates`(`id`) ON DELETE SET NULL,
	CONSTRAINT "inferences_schema_version_check" CHECK("schema_version" = 1),
	CONSTRAINT "inferences_provider_check" CHECK("provider" = 'gonka'),
	CONSTRAINT "inferences_latency_check" CHECK("latency_ms" IS NULL OR "latency_ms" >= 0)
);
--> statement-breakpoint
CREATE TABLE `protection_candidates` (
	`id` text PRIMARY KEY,
	`goal_id` text NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`source` text NOT NULL,
	`protocol_order_id` text,
	`underlying_asset` text NOT NULL,
	`option_type` text NOT NULL,
	`strike_usd` text NOT NULL,
	`expiry` text NOT NULL,
	`settlement_token_address` text NOT NULL,
	`settlement_token_symbol` text NOT NULL,
	`settlement_token_decimals` integer NOT NULL,
	`premium_amount_base_units` text NOT NULL,
	`premium_usd` text NOT NULL,
	`quantity_base_units` text NOT NULL,
	`quantity_underlying` text NOT NULL,
	`max_premium_loss_usd` text NOT NULL,
	`estimated_floor_usd` text NOT NULL,
	`deadline_gap_hours` integer NOT NULL,
	`goal_coverage_bps` integer NOT NULL,
	`available_quantity_base_units` text,
	`status` text NOT NULL,
	`rejection_reasons_json` text DEFAULT '[]' NOT NULL,
	`protocol_raw_json` text NOT NULL,
	`scenarios_json` text NOT NULL,
	`market_as_of` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT `fk_protection_candidates_goal_id_goals_id_fk` FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON DELETE CASCADE,
	CONSTRAINT "candidates_schema_version_check" CHECK("schema_version" = 1),
	CONSTRAINT "candidates_token_decimals_check" CHECK("settlement_token_decimals" >= 0 AND "settlement_token_decimals" <= 255),
	CONSTRAINT "candidates_deadline_gap_check" CHECK("deadline_gap_hours" >= 0),
	CONSTRAINT "candidates_coverage_check" CHECK("goal_coverage_bps" >= 0 AND "goal_coverage_bps" <= 10000)
);
--> statement-breakpoint
CREATE TABLE `trades` (
	`id` text PRIMARY KEY,
	`goal_id` text NOT NULL,
	`candidate_id` text NOT NULL,
	`council_decision_id` text NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`idempotency_key` text NOT NULL,
	`wallet_address` text NOT NULL,
	`chain_id` integer NOT NULL,
	`status` text NOT NULL,
	`quote_fingerprint` text NOT NULL,
	`preview_expires_at` text NOT NULL,
	`settlement_token_address` text NOT NULL,
	`premium_amount_base_units` text NOT NULL,
	`premium_usd` text NOT NULL,
	`tx_hash` text,
	`protocol_position_id` text,
	`failure_code` text,
	`failure_message` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`submitted_at` text,
	`confirmed_at` text,
	CONSTRAINT `fk_trades_goal_id_goals_id_fk` FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `fk_trades_candidate_id_protection_candidates_id_fk` FOREIGN KEY (`candidate_id`) REFERENCES `protection_candidates`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `fk_trades_council_decision_id_council_decisions_id_fk` FOREIGN KEY (`council_decision_id`) REFERENCES `council_decisions`(`id`) ON DELETE RESTRICT,
	CONSTRAINT "trades_schema_version_check" CHECK("schema_version" = 1),
	CONSTRAINT "trades_chain_id_check" CHECK("chain_id" = 8453),
	CONSTRAINT "trades_idempotency_length_check" CHECK(length("idempotency_key") BETWEEN 16 AND 128)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `decisions_candidate_attempt_idx` ON `council_decisions` (`candidate_id`,`attempt`);--> statement-breakpoint
CREATE INDEX `decisions_goal_created_idx` ON `council_decisions` (`goal_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `decisions_candidate_created_idx` ON `council_decisions` (`candidate_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_decision_role_idx` ON `council_reviews` (`decision_id`,`role`);--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_inference_idx` ON `council_reviews` (`inference_id`);--> statement-breakpoint
CREATE INDEX `reviews_decision_idx` ON `council_reviews` (`decision_id`);--> statement-breakpoint
CREATE INDEX `goals_status_updated_idx` ON `goals` (`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `goals_deadline_idx` ON `goals` (`deadline`);--> statement-breakpoint
CREATE INDEX `inferences_goal_purpose_created_idx` ON `gonka_inferences` (`goal_id`,`purpose`,`created_at`);--> statement-breakpoint
CREATE INDEX `inferences_candidate_purpose_idx` ON `gonka_inferences` (`candidate_id`,`purpose`);--> statement-breakpoint
CREATE UNIQUE INDEX `inferences_request_id_idx` ON `gonka_inferences` (`request_id`) WHERE "gonka_inferences"."request_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `candidates_goal_status_idx` ON `protection_candidates` (`goal_id`,`status`);--> statement-breakpoint
CREATE INDEX `candidates_expiry_idx` ON `protection_candidates` (`expiry`);--> statement-breakpoint
CREATE INDEX `candidates_source_order_idx` ON `protection_candidates` (`source`,`protocol_order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `candidates_one_selected_per_goal_idx` ON `protection_candidates` (`goal_id`) WHERE "protection_candidates"."status" = 'selected';--> statement-breakpoint
CREATE UNIQUE INDEX `trades_idempotency_key_idx` ON `trades` (`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `trades_tx_hash_idx` ON `trades` (`tx_hash`) WHERE "trades"."tx_hash" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `trades_goal_created_idx` ON `trades` (`goal_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `trades_wallet_created_idx` ON `trades` (`wallet_address`,`created_at`);--> statement-breakpoint
CREATE INDEX `trades_status_updated_idx` ON `trades` (`status`,`updated_at`);