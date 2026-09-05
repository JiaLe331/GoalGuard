CREATE TABLE "telegram_connections" (
	"id" uuid PRIMARY KEY,
	"owner_session_hash" varchar(64) NOT NULL,
	"telegram_user_id" varchar(32) NOT NULL,
	"telegram_chat_id" varchar(32) NOT NULL,
	"status" text NOT NULL,
	"timezone" varchar(100) DEFAULT 'UTC' NOT NULL,
	"linked_at" timestamp with time zone NOT NULL,
	"last_interaction_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "telegram_connections_status_check" CHECK ("status" IN ('connected', 'revoked', 'blocked')),
	CONSTRAINT "telegram_connections_owner_hash_check" CHECK ("owner_session_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "telegram_connections_user_id_check" CHECK ("telegram_user_id" ~ '^[0-9]{1,32}$'),
	CONSTRAINT "telegram_connections_chat_id_check" CHECK ("telegram_chat_id" ~ '^[0-9]{1,32}$'),
	CONSTRAINT "telegram_connections_revoked_at_check" CHECK (("status" = 'connected' AND "revoked_at" IS NULL) OR ("status" IN ('revoked', 'blocked') AND "revoked_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "telegram_connections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "telegram_link_tokens" (
	"id" uuid PRIMARY KEY,
	"owner_session_hash" varchar(64) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"timezone" varchar(100) DEFAULT 'UTC' NOT NULL,
	"status" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "telegram_link_tokens_status_check" CHECK ("status" IN ('pending', 'consumed', 'superseded', 'expired')),
	CONSTRAINT "telegram_link_tokens_owner_hash_check" CHECK ("owner_session_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "telegram_link_tokens_hash_check" CHECK ("token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "telegram_link_tokens_consumed_at_check" CHECK (("status" = 'consumed' AND "consumed_at" IS NOT NULL) OR ("status" <> 'consumed' AND "consumed_at" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "telegram_link_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "telegram_notification_deliveries" (
	"id" uuid PRIMARY KEY,
	"connection_id" uuid,
	"telegram_chat_id" varchar(32) NOT NULL,
	"kind" text NOT NULL,
	"goal_id" uuid,
	"candidate_id" uuid,
	"decision_id" uuid,
	"trade_id" uuid,
	"dedupe_key" varchar(160) NOT NULL,
	"payload_json" jsonb NOT NULL,
	"status" text NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone NOT NULL,
	"lease_until" timestamp with time zone,
	"telegram_message_id" varchar(32),
	"last_error_code" varchar(64),
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	CONSTRAINT "telegram_deliveries_chat_id_check" CHECK ("telegram_chat_id" ~ '^[0-9]{1,32}$'),
	CONSTRAINT "telegram_deliveries_kind_check" CHECK ("kind" IN ('connection_receipt', 'command_reply', 'unlink_confirmation', 'council_approved', 'council_disputed', 'council_blocked', 'preview_ready', 'preview_expiring', 'goal_deadline', 'option_expiry')),
	CONSTRAINT "telegram_deliveries_status_check" CHECK ("status" IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
	CONSTRAINT "telegram_deliveries_attempt_count_check" CHECK ("attempt_count" >= 0),
	CONSTRAINT "telegram_deliveries_lease_check" CHECK ("status" <> 'processing' OR "lease_until" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "telegram_notification_deliveries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "telegram_notification_preferences" (
	"connection_id" uuid PRIMARY KEY,
	"council_results" boolean DEFAULT true NOT NULL,
	"preview_ready" boolean DEFAULT true NOT NULL,
	"preview_expiring" boolean DEFAULT false NOT NULL,
	"goal_deadlines" boolean DEFAULT true NOT NULL,
	"option_expiry" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "telegram_notification_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "telegram_webhook_updates" (
	"update_id" varchar(32) PRIMARY KEY,
	"processed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "telegram_webhook_updates_id_check" CHECK ("update_id" ~ '^[0-9]{1,32}$')
);
--> statement-breakpoint
ALTER TABLE "telegram_webhook_updates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "telegram_connections_owner_idx" ON "telegram_connections" ("owner_session_hash");--> statement-breakpoint
CREATE INDEX "telegram_connections_chat_idx" ON "telegram_connections" ("telegram_chat_id");--> statement-breakpoint
CREATE INDEX "telegram_connections_user_idx" ON "telegram_connections" ("telegram_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_connections_owner_active_idx" ON "telegram_connections" ("owner_session_hash") WHERE "status" = 'connected';--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_connections_chat_active_idx" ON "telegram_connections" ("telegram_chat_id") WHERE "status" = 'connected';--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_connections_user_active_idx" ON "telegram_connections" ("telegram_user_id") WHERE "status" = 'connected';--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_link_tokens_hash_idx" ON "telegram_link_tokens" ("token_hash");--> statement-breakpoint
CREATE INDEX "telegram_link_tokens_owner_status_idx" ON "telegram_link_tokens" ("owner_session_hash","status");--> statement-breakpoint
CREATE INDEX "telegram_link_tokens_expiry_idx" ON "telegram_link_tokens" ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_deliveries_dedupe_key_idx" ON "telegram_notification_deliveries" ("dedupe_key");--> statement-breakpoint
CREATE INDEX "telegram_deliveries_due_idx" ON "telegram_notification_deliveries" ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "telegram_deliveries_connection_status_idx" ON "telegram_notification_deliveries" ("connection_id","status");--> statement-breakpoint
CREATE INDEX "telegram_deliveries_goal_idx" ON "telegram_notification_deliveries" ("goal_id","status");--> statement-breakpoint
CREATE INDEX "telegram_webhook_updates_processed_idx" ON "telegram_webhook_updates" ("processed_at");--> statement-breakpoint
ALTER TABLE "telegram_notification_deliveries" ADD CONSTRAINT "telegram_notification_deliveries_IQY6aAR6pf7v_fkey" FOREIGN KEY ("connection_id") REFERENCES "telegram_connections"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "telegram_notification_deliveries" ADD CONSTRAINT "telegram_notification_deliveries_goal_id_goals_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "telegram_notification_deliveries" ADD CONSTRAINT "telegram_notification_deliveries_0adOxABVmYvX_fkey" FOREIGN KEY ("candidate_id") REFERENCES "protection_candidates"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "telegram_notification_deliveries" ADD CONSTRAINT "telegram_notification_deliveries_x6TvSQ55sT7b_fkey" FOREIGN KEY ("decision_id") REFERENCES "council_decisions"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "telegram_notification_deliveries" ADD CONSTRAINT "telegram_notification_deliveries_trade_id_trades_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "telegram_notification_preferences" ADD CONSTRAINT "telegram_notification_preferences_XMW8lZwJpqCP_fkey" FOREIGN KEY ("connection_id") REFERENCES "telegram_connections"("id") ON DELETE CASCADE;