ALTER TABLE "goals" ADD COLUMN "protect_through_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "funds_needed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "goal_timezone" text;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "timing_confirmed" boolean;--> statement-breakpoint
ALTER TABLE "protection_candidates" ADD COLUMN "spot_price_usd" text;--> statement-breakpoint
ALTER TABLE "protection_candidates" ADD COLUMN "required_quantity_base_units" text;--> statement-breakpoint
ALTER TABLE "protection_candidates" ADD COLUMN "required_floor_usd" text;--> statement-breakpoint
ALTER TABLE "protection_candidates" ADD COLUMN "protected_floor_at_expiry_usd" text;--> statement-breakpoint
ALTER TABLE "protection_candidates" ADD COLUMN "accessible_floor_by_goal_date_usd" text;--> statement-breakpoint
ALTER TABLE "protection_candidates" ADD COLUMN "expiry_shortfall_usd" text;--> statement-breakpoint
ALTER TABLE "protection_candidates" ADD COLUMN "goal_date_shortfall_usd" text;--> statement-breakpoint
ALTER TABLE "protection_candidates" ADD COLUMN "protection_end_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "protection_candidates" ADD COLUMN "settlement_available_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "protection_candidates" ADD COLUMN "settlement_confirmation_allowance_seconds" integer;--> statement-breakpoint
ALTER TABLE "protection_candidates" ADD COLUMN "settlement_trigger" text;--> statement-breakpoint
ALTER TABLE "protection_candidates" ADD COLUMN "settlement_timing_status" text;--> statement-breakpoint
ALTER TABLE "protection_candidates" ADD COLUMN "accessibility_basis" text;--> statement-breakpoint
ALTER TABLE "protection_candidates" ADD COLUMN "timing_accessible" boolean;--> statement-breakpoint
ALTER TABLE "protection_candidates" ADD COLUMN "goal_attainment" text;--> statement-breakpoint
ALTER TABLE "protection_candidates" ADD COLUMN "score_version" text;--> statement-breakpoint
ALTER TABLE "protection_candidates" ADD COLUMN "protection_score" integer;--> statement-breakpoint
ALTER TABLE "protection_candidates" ADD COLUMN "score_breakdown_json" jsonb;--> statement-breakpoint
ALTER TABLE "protection_candidates" ADD COLUMN "policy_version" text;--> statement-breakpoint
ALTER TABLE "protection_candidates" ADD COLUMN "expiry_overhang_seconds" integer;--> statement-breakpoint
ALTER TABLE "protection_candidates" ADD COLUMN "settlement_lead_seconds" integer;--> statement-breakpoint
ALTER TABLE "protection_candidates" ADD COLUMN "effective_budget_usd" text;--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "schema_version" SET DEFAULT 2;--> statement-breakpoint
ALTER TABLE "protection_candidates" ALTER COLUMN "schema_version" SET DEFAULT 2;--> statement-breakpoint
ALTER TABLE "goals" DROP CONSTRAINT "goals_schema_version_check", ADD CONSTRAINT "goals_schema_version_check" CHECK ("schema_version" IN (1, 2));--> statement-breakpoint
ALTER TABLE "protection_candidates" DROP CONSTRAINT "candidates_schema_version_check", ADD CONSTRAINT "candidates_schema_version_check" CHECK ("schema_version" IN (1, 2));--> statement-breakpoint
UPDATE "goals"
SET "protect_through_at" = ("deadline"::timestamp AT TIME ZONE 'UTC'),
    "funds_needed_at" = ("deadline"::timestamp AT TIME ZONE 'UTC'),
    "goal_timezone" = 'UTC',
    "timing_confirmed" = false,
    "schema_version" = 2
WHERE "protect_through_at" IS NULL OR "funds_needed_at" IS NULL OR "goal_timezone" IS NULL OR "timing_confirmed" IS NULL OR "schema_version" = 1;
