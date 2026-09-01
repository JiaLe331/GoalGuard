CREATE TABLE "trade_request_idempotency" (
	"key" varchar(128) PRIMARY KEY,
	"operation" text NOT NULL,
	"owner_session_hash" varchar(64) NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"status" text NOT NULL,
	"trade_id" uuid,
	"response_json" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "trade_idempotency_key_length_check" CHECK (length("key") BETWEEN 16 AND 128),
	CONSTRAINT "trade_idempotency_operation_check" CHECK ("operation" IN ('preview', 'execute', 'submission')),
	CONSTRAINT "trade_idempotency_status_check" CHECK ("status" IN ('in_progress', 'completed'))
);
--> statement-breakpoint
ALTER TABLE "trade_request_idempotency" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "trade_idempotency_owner_created_idx" ON "trade_request_idempotency" ("owner_session_hash","created_at");--> statement-breakpoint
CREATE INDEX "trade_idempotency_trade_idx" ON "trade_request_idempotency" ("trade_id");--> statement-breakpoint
ALTER TABLE "trade_request_idempotency" ADD CONSTRAINT "trade_request_idempotency_trade_id_trades_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON DELETE RESTRICT;