import { z } from "zod";

import { CouncilRoleSchema, CouncilVerdictSchema, CoverageModeSchema, GoalTypeSchema, InferencePurposeSchema, InferenceStatusSchema, SupportedAssetSchema } from "./enums";
import {
  CouncilDecisionSchema,
  GoalSchema,
  MarketSnapshotSchema,
  ProtectionChainEntrySchema,
  PublicProtectionCandidateSchema,
  TradeSchema,
} from "./entities";
import { ApiMetaSchema } from "./errors";
import {
  BaseUnitStringSchema,
  DecimalStringSchema,
  EvmAddressSchema,
  HexDataSchema,
  ISODateSchema,
  ISODateTimeSchema,
  TxHashSchema,
  UUIDSchema,
} from "./scalars";

export const GoalDraftFieldSchema = z.enum([
  "goalType",
  "customGoalLabel",
  "underlyingAsset",
  "protectedValueUsd",
  "deadline",
  "maxLossBps",
  "maxPremiumUsd",
]);

export const GoalDraftSchema = z.object({
  goalType: GoalTypeSchema.optional(),
  customGoalLabel: z.string().trim().min(1).max(80).nullable().optional(),
  underlyingAsset: SupportedAssetSchema.optional(),
  protectedValueUsd: DecimalStringSchema.optional(),
  deadline: ISODateSchema.optional(),
  maxLossBps: z.number().int().min(0).max(9999).optional(),
  maxPremiumUsd: DecimalStringSchema.nullable().optional(),
}).strict();

export const InferenceSummarySchema = z.object({
  id: UUIDSchema,
  purpose: InferencePurposeSchema,
  model: z.string().trim().min(1),
  requestId: z.string().trim().min(1).nullable(),
  status: InferenceStatusSchema,
}).strict();

export const ParseGoalRequestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  draft: GoalDraftSchema.optional(),
  locale: z.string().trim().min(2).optional(),
  timezone: z.string().trim().min(1).optional(),
}).strict();

export const ParseGoalResponseSchema = z.object({
  data: z.object({
    draft: GoalDraftSchema,
    missingFields: z.array(GoalDraftFieldSchema),
    clarificationQuestion: z.string().trim().min(1).nullable(),
    goal: GoalSchema.nullable(),
    inference: InferenceSummarySchema,
  }).strict(),
  meta: ApiMetaSchema,
}).strict();

export const UpdateGoalRequestSchema = z.object({
  goalType: GoalTypeSchema,
  customGoalLabel: z.string().trim().min(1).max(80).nullable(),
  underlyingAsset: SupportedAssetSchema,
  protectedValueUsd: DecimalStringSchema,
  deadline: ISODateSchema,
  maxLossBps: z.number().int().min(0).max(9999),
  maxPremiumUsd: DecimalStringSchema.nullable(),
}).strict().superRefine((goal, context) => {
  if (goal.goalType === "custom" && goal.customGoalLabel === null) {
    context.addIssue({ code: "custom", path: ["customGoalLabel"], message: "A custom goal requires a label." });
  }
  if (goal.goalType !== "custom" && goal.customGoalLabel !== null) {
    context.addIssue({ code: "custom", path: ["customGoalLabel"], message: "Only custom goals may have a custom label." });
  }
});

export const UpdateGoalResponseSchema = z.object({
  data: z.object({ goal: GoalSchema }).strict(),
  meta: ApiMetaSchema,
}).strict();

export const GenerateCandidatesRequestSchema = z.object({
  goalId: UUIDSchema,
  refresh: z.boolean().optional(),
  coverageMode: CoverageModeSchema.optional(),
}).strict();

export const CandidateRejectionSchema = z.object({
  protocolOrderId: z.string().nullable(),
  strikeUsd: DecimalStringSchema.nullable(),
  expiry: ISODateTimeSchema.nullable(),
  premiumUsd: DecimalStringSchema.nullable(),
  reasons: z.array(z.string().trim().min(1)),
}).strict();

export const GenerateCandidatesResponseSchema = z.object({
  data: z.object({
    goal: GoalSchema,
    candidates: z.array(PublicProtectionCandidateSchema),
    chain: z.array(ProtectionChainEntrySchema),
    selectedCandidateId: UUIDSchema.nullable(),
    rejected: z.array(CandidateRejectionSchema),
    ethSpotUsd: DecimalStringSchema,
    marketAsOf: ISODateTimeSchema,
  }).strict(),
  meta: ApiMetaSchema,
}).strict();

export const ReviewCandidateRequestSchema = z.object({
  goalId: UUIDSchema,
  candidateId: UUIDSchema,
  forceNewAttempt: z.boolean().optional(),
}).strict();

export const ReviewCandidateResponseSchema = z.object({
  data: z.object({
    goal: GoalSchema,
    candidate: PublicProtectionCandidateSchema,
    decision: CouncilDecisionSchema,
    inferences: z.array(InferenceSummarySchema).length(3),
  }).strict(),
  meta: ApiMetaSchema,
}).strict();

export const GetCouncilReviewStatusRequestSchema = z.object({
  goalId: UUIDSchema,
  candidateId: UUIDSchema,
}).strict();

// A role's live status while the council is still in-flight. "waiting"/"running" carry no
// gonka_inferences row yet -- see PostgresGoalGuardRepository.getCurrentCouncilAttemptInferences.
export const CouncilRoleStatusSchema = z.enum(["waiting", "running", "succeeded", "failed"]);

export const CouncilRoleProgressSchema = z.object({
  role: CouncilRoleSchema,
  status: CouncilRoleStatusSchema,
  model: z.string().trim().min(1).nullable(),
  requestId: z.string().trim().min(1).nullable(),
  startedAt: ISODateTimeSchema.nullable(),
  completedAt: ISODateTimeSchema.nullable(),
  latencyMs: z.number().int().nonnegative().nullable(),
  verdict: CouncilVerdictSchema.nullable(),
  summary: z.string().trim().min(1).max(1000).nullable(),
  concerns: z.array(z.string().trim().min(1).max(500)),
  errorMessage: z.string().trim().min(1).nullable(),
}).strict();

export const GetCouncilReviewStatusResponseSchema = z.object({
  data: z.object({ roles: z.array(CouncilRoleProgressSchema).length(3) }).strict(),
  meta: ApiMetaSchema,
}).strict();

export const PreviewTradeRequestSchema = z.object({
  goalId: UUIDSchema,
  candidateId: UUIDSchema,
  councilDecisionId: UUIDSchema,
  walletAddress: EvmAddressSchema,
}).strict();

export const AllowanceRequirementSchema = z.object({
  tokenAddress: EvmAddressSchema,
  spenderAddress: EvmAddressSchema,
  currentAmountBaseUnits: BaseUnitStringSchema,
  requiredAmountBaseUnits: BaseUnitStringSchema,
  approvalRequired: z.boolean(),
}).strict();

export const PreparedTransactionSchema = z.object({
  chainId: z.literal(8453),
  to: EvmAddressSchema,
  data: HexDataSchema,
  valueBaseUnits: BaseUnitStringSchema,
}).strict();

export const BalanceReadinessSchema = z.object({
  symbol: z.string().trim().min(1).max(16),
  balanceBaseUnits: BaseUnitStringSchema,
  requiredBaseUnits: BaseUnitStringSchema,
  sufficient: z.boolean(),
}).strict();

export const WalletReadinessSchema = z.object({
  gas: BalanceReadinessSchema,
  settlementToken: BalanceReadinessSchema,
  underlyingExposure: BalanceReadinessSchema,
}).strict();

export const ReferralDisclosureSchema = z.object({
  referrerAddress: EvmAddressSchema.nullable(),
  mayReceiveFee: z.boolean(),
  message: z.string().trim().min(1),
}).strict();

export const UnsignedPreviewProposalSchema = z.object({
  premiumAmountBaseUnits: BaseUnitStringSchema,
  quantityBaseUnits: BaseUnitStringSchema,
  coverageMode: CoverageModeSchema,
  goalCoverageBps: z.number().int().min(0).max(10000),
}).strict();

export const TradePreviewSchema = z.object({
  trade: TradeSchema,
  candidate: PublicProtectionCandidateSchema,
  allowance: AllowanceRequirementSchema.nullable(),
  approvalTransaction: PreparedTransactionSchema.nullable(),
  executionTransaction: PreparedTransactionSchema,
  estimatedGasBaseUnits: BaseUnitStringSchema.nullable(),
  walletReadiness: WalletReadinessSchema,
  referralDisclosure: ReferralDisclosureSchema,
  purpose: z.literal("unsigned_transaction_preview"),
  proposal: UnsignedPreviewProposalSchema,
  warnings: z.array(z.string()),
}).strict();

export const PreviewTradeResponseSchema = z.object({ data: TradePreviewSchema, meta: ApiMetaSchema }).strict();

export const PrepareExecutionRequestSchema = z.object({
  tradeId: UUIDSchema,
  quoteFingerprint: z.string().trim().min(1),
  walletAddress: EvmAddressSchema,
  chainId: z.literal(8453),
  userConfirmed: z.literal(true),
}).strict();

export const PrepareExecutionResponseSchema = z.object({
  data: z.object({
    trade: TradeSchema,
    approvalTransaction: PreparedTransactionSchema.nullable(),
    executionTransaction: PreparedTransactionSchema,
  }).strict(),
  meta: ApiMetaSchema,
}).strict();

export const RecordSubmissionRequestSchema = z.object({
  txHash: TxHashSchema,
  walletAddress: EvmAddressSchema,
}).strict();

export const RecordSubmissionResponseSchema = z.object({
  data: z.object({ trade: TradeSchema }).strict(),
  meta: ApiMetaSchema,
}).strict();

export const GetTradeResponseSchema = z.object({
  data: z.object({
    trade: TradeSchema,
    receipt: z.object({
      blockNumber: BaseUnitStringSchema,
      success: z.boolean(),
      confirmations: z.number().int().nonnegative(),
      explorerUrl: z.string().url(),
    }).strict().nullable(),
  }).strict(),
  meta: ApiMetaSchema,
}).strict();

export const GetGoalResponseSchema = z.object({
  data: z.object({
    goal: GoalSchema,
    selectedCandidate: PublicProtectionCandidateSchema.nullable(),
    councilDecision: CouncilDecisionSchema.nullable(),
    trade: TradeSchema.nullable(),
  }).strict(),
  meta: ApiMetaSchema,
}).strict();

export const IntegrationStatusResponseSchema = z.object({
  data: z.object({
    database: z.object({ status: z.enum(["ready", "error"]) }).strict(),
    gonka: z.object({
      status: z.enum(["ready", "unconfigured", "degraded", "error"]),
      model: z.string().nullable(),
      requestId: z.string().nullable(),
    }).strict(),
    thetanuts: z.object({
      status: z.enum(["ready", "unconfigured", "error"]),
      chainId: z.literal(8453),
      activeEthPutCount: z.number().int().nonnegative().nullable(),
      marketAsOf: ISODateTimeSchema.nullable(),
    }).strict(),
  }).strict(),
  meta: ApiMetaSchema,
}).strict();

// The dashboard rail receives only the small worker-owned market snapshot. Raw Thetanuts orders
// and protocol payloads remain server-only; a missing snapshot is an honest empty state.
// `series` is the same worker-owned snapshots in ascending capture order, so the workspace can
// draw the recent trend without a second round trip. Newest last; empty until the worker has run.
export const MarketSummaryResponseSchema = z.object({
  data: z.object({
    snapshot: MarketSnapshotSchema.nullable(),
    series: z.array(MarketSnapshotSchema),
  }).strict(),
  meta: ApiMetaSchema,
}).strict();

export type GoalDraftField = z.infer<typeof GoalDraftFieldSchema>;
export type GoalDraft = z.infer<typeof GoalDraftSchema>;
export type InferenceSummary = z.infer<typeof InferenceSummarySchema>;
export type ParseGoalRequest = z.infer<typeof ParseGoalRequestSchema>;
export type ParseGoalResponse = z.infer<typeof ParseGoalResponseSchema>;
export type UpdateGoalRequest = z.infer<typeof UpdateGoalRequestSchema>;
export type UpdateGoalResponse = z.infer<typeof UpdateGoalResponseSchema>;
export type GenerateCandidatesRequest = z.infer<typeof GenerateCandidatesRequestSchema>;
export type CandidateRejection = z.infer<typeof CandidateRejectionSchema>;
export type GenerateCandidatesResponse = z.infer<typeof GenerateCandidatesResponseSchema>;
export type ReviewCandidateRequest = z.infer<typeof ReviewCandidateRequestSchema>;
export type ReviewCandidateResponse = z.infer<typeof ReviewCandidateResponseSchema>;
export type CouncilRoleProgress = z.infer<typeof CouncilRoleProgressSchema>;
export type GetCouncilReviewStatusResponse = z.infer<typeof GetCouncilReviewStatusResponseSchema>;
export type PreviewTradeRequest = z.infer<typeof PreviewTradeRequestSchema>;
export type AllowanceRequirement = z.infer<typeof AllowanceRequirementSchema>;
export type PreparedTransaction = z.infer<typeof PreparedTransactionSchema>;
export type BalanceReadiness = z.infer<typeof BalanceReadinessSchema>;
export type WalletReadiness = z.infer<typeof WalletReadinessSchema>;
export type ReferralDisclosure = z.infer<typeof ReferralDisclosureSchema>;
export type UnsignedPreviewProposal = z.infer<typeof UnsignedPreviewProposalSchema>;
export type TradePreview = z.infer<typeof TradePreviewSchema>;
export type PreviewTradeResponse = z.infer<typeof PreviewTradeResponseSchema>;
export type PrepareExecutionRequest = z.infer<typeof PrepareExecutionRequestSchema>;
export type PrepareExecutionResponse = z.infer<typeof PrepareExecutionResponseSchema>;
export type RecordSubmissionRequest = z.infer<typeof RecordSubmissionRequestSchema>;
export type RecordSubmissionResponse = z.infer<typeof RecordSubmissionResponseSchema>;
export type GetTradeResponse = z.infer<typeof GetTradeResponseSchema>;
export type GetGoalResponse = z.infer<typeof GetGoalResponseSchema>;
export type IntegrationStatusResponse = z.infer<typeof IntegrationStatusResponseSchema>;
export type MarketSummaryResponse = z.infer<typeof MarketSummaryResponseSchema>;
