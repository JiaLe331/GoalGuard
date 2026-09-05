CREATE TABLE "market_snapshots" (
	"captured_at" timestamp with time zone PRIMARY KEY,
	"eth_spot_usd" text NOT NULL,
	"option_count" integer NOT NULL,
	"median_iv_bps" integer,
	"cost_per_100_usd_30d" text,
	CONSTRAINT "market_snapshots_option_count_check" CHECK ("option_count" >= 0),
	CONSTRAINT "market_snapshots_iv_check" CHECK ("median_iv_bps" IS NULL OR "median_iv_bps" >= 0)
);
--> statement-breakpoint
ALTER TABLE "market_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "market_snapshots_captured_at_idx" ON "market_snapshots" ("captured_at");