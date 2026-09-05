import Decimal from "decimal.js";
import { z } from "zod";

import {
  CandidateSourceSchema,
  CandidateStatusSchema,
  CoverageModeSchema,
  CouncilRoleSchema,
  CouncilStatusSchema,
  CouncilVerdictSchema,
  GoalStatusSchema,
  GoalTypeSchema,
  InferencePurposeSchema,
  InferenceStatusSchema,
  OptionTypeSchema,
  SettlementTypeSchema,
  SupportedAssetSchema,
  TradeStatusSchema,
} from "./enums";
import {
  BaseUnitStringSchema,
  DecimalStringSchema,
  EvmAddressSchema,
  ISODateSchema,
  ISODateTimeSchema,
  JsonValueSchema,
  Sha256Schema,
  SignedDecimalStringSchema,
  TxHashSchema,
  UUIDSchema,
} from "./scalars";

const positiveDecimal = DecimalStringSchema.refine((value) => new Decimal(value).greaterThan(0), "Expected a value greater than zero.");
const nonNegativeDecimal = DecimalStringSchema.refine((value) => new Decimal(value).greaterThanOrEqualTo(0), "Expected a non-negative value.");
const nonEmptyShortString = z.string().trim().min(1).max(500);

export const GoalSchema = z.object({
  schemaVersion: z.literal(1),
  id: UUIDSchema,
  goalType: GoalTypeSchema,
  customGoalLabel: z.string().trim().min(1).max(80).nullable(),
  underlyingAsset: SupportedAssetSchema,
  protectedValueUsd: positiveDecimal,
  deadline: ISODateSchema,
  maxLossBps: z.number().int().min(0).max(9999),
  maxPremiumUsd: positiveDecimal.nullable(),
  originalUserMessage: z.string().trim().min(1).max(4000),
  status: GoalStatusSchema,
  createdAt: ISODateTimeSchema,
  updatedAt: ISODateTimeSchema,
  parseInferenceId: UUIDSchema.nullable(),
  selectedCandidateId: UUIDSchema.nullable(),
  councilDecisionId: UUIDSchema.nullable(),
  tradeId: UUIDSchema.nullable(),
}).strict().superRefine((goal, context) => {
  if (goal.goalType === "custom" && goal.customGoalLabel === null) {
    context.addIssue({ code: "custom", path: ["customGoalLabel"], message: "A custom goal requires a label." });
  }
  if (goal.goalType !== "custom" && goal.customGoalLabel !== null) {
    context.addIssue({ code: "custom", path: ["customGoalLabel"], message: "Only custom goals may have a custom label." });
  }
});

export const ScenarioResultSchema = z.object({
  key: z.enum(["down", "flat", "up", "custom"]),
  settlementPriceUsd: DecimalStringSchema,
  underlyingValueUsd: DecimalStringSchema,
  optionPayoffUsd: DecimalStringSchema,
  premiumCostUsd: DecimalStringSchema,
  netProtectedValueUsd: SignedDecimalStringSchema,
}).strict();

export const ProtectionCandidateSchema = z.object({
  schemaVersion: z.literal(1),
  id: UUIDSchema,
  goalId: UUIDSchema,
  source: CandidateSourceSchema,
  protocolOrderId: z.string().trim().min(1).nullable(),
  underlyingAsset: SupportedAssetSchema,
  optionType: OptionTypeSchema,
  settlementType: SettlementTypeSchema,
  // Thetanuts' option-book Greek is promoted as a curated, integer basis-point
  // value. The raw order payload remains server-only below.
  impliedVolatilityBps: z.number().int().nonnegative().nullable(),
  strikeUsd: positiveDecimal,
  expiry: ISODateTimeSchema,
  settlementTokenAddress: EvmAddressSchema,
  settlementTokenSymbol: z.string().trim().min(1).max(16),
  settlementTokenDecimals: z.number().int().min(0).max(255),
  premiumAmountBaseUnits: BaseUnitStringSchema,
  premiumUsd: positiveDecimal,
  quantityBaseUnits: BaseUnitStringSchema.refine((value) => value !== "0", "Quantity must be greater than zero."),
  quantityUnderlying: positiveDecimal,
  maxPremiumLossUsd: positiveDecimal,
  estimatedFloorUsd: DecimalStringSchema,
  deadlineGapHours: z.number().int().nonnegative(),
  goalCoverageBps: z.number().int().min(0).max(10000),
  coverageMode: CoverageModeSchema,
  availableQuantityBaseUnits: BaseUnitStringSchema.nullable(),
  status: CandidateStatusSchema,
  rejectionReasons: z.array(nonEmptyShortString),
  protocolRaw: JsonValueSchema,
  scenarios: z.array(ScenarioResultSchema),
  marketAsOf: ISODateTimeSchema,
  createdAt: ISODateTimeSchema,
  updatedAt: ISODateTimeSchema,
}).strict().superRefine((candidate, context) => {
  if (candidate.source === "optionbook" && candidate.protocolOrderId === null) {
    context.addIssue({ code: "custom", path: ["protocolOrderId"], message: "OptionBook candidates require an order ID." });
  }
  const mayExplainRejection = candidate.status === "rejected" || candidate.status === "stale";
  if (!mayExplainRejection && candidate.rejectionReasons.length > 0) {
    context.addIssue({ code: "custom", path: ["rejectionReasons"], message: "Only rejected or stale candidates may have rejection reasons." });
  }
  if (candidate.coverageMode === "full" && candidate.goalCoverageBps !== 10000) {
    context.addIssue({ code: "custom", path: ["goalCoverageBps"], message: "Full coverage requires 10000 basis points." });
  }
  if (candidate.coverageMode === "proportional_demo" && (candidate.goalCoverageBps <= 0 || candidate.goalCoverageBps >= 10000)) {
    context.addIssue({ code: "custom", path: ["goalCoverageBps"], message: "A proportional demo requires partial positive coverage." });
  }
  for (const requiredKey of ["down", "flat", "up"] as const) {
    if (candidate.scenarios.filter(({ key }) => key === requiredKey).length !== 1) {
      context.addIssue({ code: "custom", path: ["scenarios"], message: `Scenario ${requiredKey} must appear exactly once.` });
    }
  }
});

// protocolRaw is deliberately an internal-only persistence field. Public API
// responses must be built with this schema so upstream payloads cannot leak.
export const PublicProtectionCandidateSchema = ProtectionCandidateSchema.omit({ protocolRaw: true });

// A small, ephemeral view of every viable order. It deliberately excludes the
// persistence/audit fields and the raw protocol payload. Defined here rather than beside the
// API responses because the market snapshot entity below stores one of these per order.
export const ProtectionChainEntrySchema = z.object({
  protocolOrderId: z.string().trim().min(1),
  strikeUsd: DecimalStringSchema,
  expiry: ISODateTimeSchema,
  premiumUsd: DecimalStringSchema,
  estimatedFloorUsd: DecimalStringSchema,
  impliedVolatilityBps: z.number().int().nonnegative().nullable(),
  goalCoverageBps: z.number().int().min(0).max(10000),
  settlementType: z.enum(["cash", "physical"]),
  availableQuantityBaseUnits: BaseUnitStringSchema,
  settlementTokenSymbol: z.string().trim().min(1).max(16),
  settlementTokenDecimals: z.number().int().min(0).max(255),
}).strict();
export type ProtectionChainEntry = z.infer<typeof ProtectionChainEntrySchema>;

/**
 * Small worker-owned market history; raw order payloads never enter this entity.
 * `chain` is the goal-free protection chain priced at a $100 reference notional, kept so the
 * workspace can show a real market without first running a goal-scoped search. Nullable because
 * rows written before the column existed have no chain, and an absent chain is not an empty one.
 */
export const MarketSnapshotSchema = z.object({
  capturedAt: ISODateTimeSchema,
  ethSpotUsd: positiveDecimal,
  optionCount: z.number().int().nonnegative(),
  medianIvBps: z.number().int().nonnegative().nullable(),
  costPer100Usd30d: nonNegativeDecimal.nullable(),
  chain: z.array(ProtectionChainEntrySchema).nullable().default(null),
}).strict();
export type MarketSnapshot = z.infer<typeof MarketSnapshotSchema>;

export const GonkaInferenceSchema = z.object({
  schemaVersion: z.literal(1),
  id: UUIDSchema,
  goalId: UUIDSchema.nullable(),
  candidateId: UUIDSchema.nullable(),
  purpose: InferencePurposeSchema,
  provider: z.literal("gonka"),
  model: z.string().trim().min(1),
  requestId: z.string().trim().min(1).nullable(),
  status: InferenceStatusSchema,
  inputHash: Sha256Schema,
  latencyMs: z.number().int().nonnegative().nullable(),
  errorCode: z.string().trim().min(1).nullable(),
  errorMessage: z.string().trim().min(1).nullable(),
  createdAt: ISODateTimeSchema,
  completedAt: ISODateTimeSchema.nullable(),
}).strict().superRefine((inference, context) => {
  const isReview = inference.purpose !== "goal_parse";
  if (isReview && (inference.goalId === null || inference.candidateId === null)) {
    context.addIssue({ code: "custom", path: ["goalId"], message: "Review inferences require goal and candidate IDs." });
  }
  if (inference.status === "succeeded") {
    if (inference.requestId === null || inference.completedAt === null || inference.errorCode !== null || inference.errorMessage !== null) {
      context.addIssue({ code: "custom", message: "Successful inferences require request metadata and no error fields." });
    }
  } else if (inference.errorCode === null || inference.errorMessage === null) {
    context.addIssue({ code: "custom", message: "Failed inferences require an error code and message." });
  }
});

export const CouncilReviewSchema = z.object({
  schemaVersion: z.literal(1),
  id: UUIDSchema,
  decisionId: UUIDSchema,
  inferenceId: UUIDSchema,
  role: CouncilRoleSchema,
  model: z.string().trim().min(1),
  requestId: z.string().trim().min(1),
  verdict: CouncilVerdictSchema,
  confidenceBps: z.number().int().min(0).max(10000),
  summary: z.string().trim().min(1).max(1000),
  concerns: z.array(nonEmptyShortString),
  requiredDisclosures: z.array(nonEmptyShortString),
  createdAt: ISODateTimeSchema,
}).strict();

export const CouncilDecisionSchema = z.object({
  schemaVersion: z.literal(1),
  id: UUIDSchema,
  goalId: UUIDSchema,
  candidateId: UUIDSchema,
  attempt: z.number().int().positive(),
  status: CouncilStatusSchema,
  rulesetVersion: z.string().trim().min(1).max(32),
  approvedReviewCount: z.number().int().min(0).max(3),
  rejectedReviewCount: z.number().int().min(0).max(3),
  uncertainReviewCount: z.number().int().min(0).max(3),
  blockedReasons: z.array(nonEmptyShortString),
  reviews: z.array(CouncilReviewSchema).length(3),
  createdAt: ISODateTimeSchema,
}).strict().superRefine((decision, context) => {
  const roles = new Set(decision.reviews.map(({ role }) => role));
  if (roles.size !== 3) {
    context.addIssue({ code: "custom", path: ["reviews"], message: "A decision requires all three unique council roles." });
  }
  const counts = {
    approve: decision.reviews.filter(({ verdict }) => verdict === "approve").length,
    reject: decision.reviews.filter(({ verdict }) => verdict === "reject").length,
    uncertain: decision.reviews.filter(({ verdict }) => verdict === "uncertain").length,
  };
  if (counts.approve !== decision.approvedReviewCount || counts.reject !== decision.rejectedReviewCount || counts.uncertain !== decision.uncertainReviewCount) {
    context.addIssue({ code: "custom", message: "Decision counts must match review verdicts." });
  }
  // Mirrors councilConsensus (lib/council/rules.ts): a two-thirds majority approves, any
  // rejection blocks, and a lone dissenter's concern rides along on an approved plan as a
  // disclosure rather than invalidating it.
  if (decision.status === "approved" && (counts.approve < 2 || counts.reject > 0)) {
    context.addIssue({ code: "custom", message: "Approved decisions require at least two approvals and no rejection." });
  }
  if (decision.status === "disputed" && (counts.approve >= 2 || counts.reject > 0)) {
    context.addIssue({ code: "custom", message: "Disputed decisions require a lost majority and no rejection." });
  }
  if (decision.status === "blocked" && counts.reject === 0 && decision.blockedReasons.length === 0) {
    context.addIssue({ code: "custom", message: "Blocked decisions require a rejection or deterministic blocked reason." });
  }
});

export const TradeSchema = z.object({
  schemaVersion: z.literal(1),
  id: UUIDSchema,
  goalId: UUIDSchema,
  candidateId: UUIDSchema,
  councilDecisionId: UUIDSchema,
  idempotencyKey: z.string().min(16).max(128),
  walletAddress: EvmAddressSchema,
  chainId: z.literal(8453),
  status: TradeStatusSchema,
  quoteFingerprint: Sha256Schema,
  previewExpiresAt: ISODateTimeSchema,
  settlementTokenAddress: EvmAddressSchema,
  premiumAmountBaseUnits: BaseUnitStringSchema,
  premiumUsd: positiveDecimal,
  txHash: TxHashSchema.nullable(),
  protocolPositionId: z.string().trim().min(1).nullable(),
  failureCode: z.string().trim().min(1).nullable(),
  failureMessage: z.string().trim().min(1).nullable(),
  createdAt: ISODateTimeSchema,
  updatedAt: ISODateTimeSchema,
  submittedAt: ISODateTimeSchema.nullable(),
  confirmedAt: ISODateTimeSchema.nullable(),
}).strict().superRefine((trade, context) => {
  const submitted = trade.status === "submitted" || trade.status === "confirmed";
  if (submitted && (trade.txHash === null || trade.submittedAt === null)) {
    context.addIssue({ code: "custom", message: "Submitted trades require a transaction hash and submission time." });
  }
  if (trade.status === "confirmed" && trade.confirmedAt === null) {
    context.addIssue({ code: "custom", message: "Confirmed trades require a confirmation time." });
  }
  const failed = trade.status === "failed";
  if (failed !== (trade.failureCode !== null && trade.failureMessage !== null)) {
    context.addIssue({ code: "custom", message: "Failure fields are required only for failed trades." });
  }
});

export type Goal = z.infer<typeof GoalSchema>;
export type ScenarioResult = z.infer<typeof ScenarioResultSchema>;
export type ProtectionCandidate = z.infer<typeof ProtectionCandidateSchema>;
export type PublicProtectionCandidate = z.infer<typeof PublicProtectionCandidateSchema>;
export type GonkaInference = z.infer<typeof GonkaInferenceSchema>;
export type CouncilReview = z.infer<typeof CouncilReviewSchema>;
export type CouncilDecision = z.infer<typeof CouncilDecisionSchema>;
export type Trade = z.infer<typeof TradeSchema>;
