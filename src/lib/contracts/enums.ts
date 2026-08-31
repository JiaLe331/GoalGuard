import { z } from "zod";

export const GoalTypeSchema = z.enum(["rent", "tuition", "travel", "emergency", "custom"]);
export const SupportedAssetSchema = z.literal("ETH");
export const GoalStatusSchema = z.enum(["draft", "searching", "reviewing", "ready", "protected", "failed"]);
export const CandidateSourceSchema = z.enum(["optionbook", "optionfactory"]);
export const OptionTypeSchema = z.literal("put");
export const CandidateStatusSchema = z.enum(["viable", "rejected", "selected", "stale"]);
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

export type GoalType = z.infer<typeof GoalTypeSchema>;
export type SupportedAsset = z.infer<typeof SupportedAssetSchema>;
export type GoalStatus = z.infer<typeof GoalStatusSchema>;
export type CandidateSource = z.infer<typeof CandidateSourceSchema>;
export type OptionType = z.infer<typeof OptionTypeSchema>;
export type CandidateStatus = z.infer<typeof CandidateStatusSchema>;
export type CouncilRole = z.infer<typeof CouncilRoleSchema>;
export type CouncilVerdict = z.infer<typeof CouncilVerdictSchema>;
export type CouncilStatus = z.infer<typeof CouncilStatusSchema>;
export type InferencePurpose = z.infer<typeof InferencePurposeSchema>;
export type InferenceStatus = z.infer<typeof InferenceStatusSchema>;
export type TradeStatus = z.infer<typeof TradeStatusSchema>;
