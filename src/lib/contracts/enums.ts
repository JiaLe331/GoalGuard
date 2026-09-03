import { z } from "zod";

export const GoalTypeSchema = z.enum(["rent", "tuition", "travel", "emergency", "custom"]);
export const SupportedAssetSchema = z.literal("ETH");
export const GoalStatusSchema = z.enum(["draft", "searching", "reviewing", "ready", "protected", "failed"]);
export const CandidateSourceSchema = z.enum(["optionbook", "optionfactory"]);
export const OptionTypeSchema = z.literal("put");
export const CandidateStatusSchema = z.enum(["viable", "rejected", "selected", "stale"]);
export const CoverageModeSchema = z.enum(["full", "proportional_demo"]);
export const CouncilRoleSchema = z.enum(["strategist", "risk_auditor", "consumer_advocate"]);
export const CouncilVerdictSchema = z.enum(["approve", "reject", "uncertain"]);
export const CouncilStatusSchema = z.enum(["approved", "disputed", "blocked"]);
export const InferencePurposeSchema = z.enum([
  "goal_parse",
  "strategist_review",
  "risk_auditor_review",
  "consumer_advocate_review",
]);
export const InferenceStatusSchema = z.enum(["succeeded", "failed"]);
export const TradeStatusSchema = z.enum([
  "previewed",
  "awaiting_signature",
  "submitted",
  "confirmed",
  "failed",
  "cancelled",
  "stale",
]);
export const SettlementTimingStatusSchema = z.enum(["settlement_timing_not_verified", "verified_accessible", "verified_too_late"]);
export const SettlementTriggerSchema = z.literal("factory_callback");
export const AccessibilityBasisSchema = z.enum(["unverified_factory_callback", "verified_expiry_settlement"]);
export const GoalAttainmentSchema = z.enum(["meets_if_executed", "shortfall", "not_accessible_by_goal_date", "settlement_timing_not_verified"]);
export const ScoreVersionSchema = z.literal("goal-protection-v1");

export type GoalType = z.infer<typeof GoalTypeSchema>;
export type SupportedAsset = z.infer<typeof SupportedAssetSchema>;
export type GoalStatus = z.infer<typeof GoalStatusSchema>;
export type CandidateSource = z.infer<typeof CandidateSourceSchema>;
export type OptionType = z.infer<typeof OptionTypeSchema>;
export type CandidateStatus = z.infer<typeof CandidateStatusSchema>;
export type CoverageMode = z.infer<typeof CoverageModeSchema>;
export type CouncilRole = z.infer<typeof CouncilRoleSchema>;
export type CouncilVerdict = z.infer<typeof CouncilVerdictSchema>;
export type CouncilStatus = z.infer<typeof CouncilStatusSchema>;
export type InferencePurpose = z.infer<typeof InferencePurposeSchema>;
export type InferenceStatus = z.infer<typeof InferenceStatusSchema>;
export type TradeStatus = z.infer<typeof TradeStatusSchema>;
export type SettlementTimingStatus = z.infer<typeof SettlementTimingStatusSchema>;
export type SettlementTrigger = z.infer<typeof SettlementTriggerSchema>;
export type AccessibilityBasis = z.infer<typeof AccessibilityBasisSchema>;
export type GoalAttainment = z.infer<typeof GoalAttainmentSchema>;
export type ScoreVersion = z.infer<typeof ScoreVersionSchema>;
