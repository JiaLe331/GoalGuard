import Decimal from "decimal.js";
import { z } from "zod";

import {
  CoverageModeSchema,
  GoalStatusSchema,
  SettlementTypeSchema,
} from "@/lib/contracts/enums";
import {
  DecimalStringSchema,
  ISODateSchema,
  ISODateTimeSchema,
  Sha256Schema,
  UUIDSchema,
} from "@/lib/contracts/scalars";

const positiveDecimal = DecimalStringSchema.refine(
  (value) => new Decimal(value).greaterThan(0),
  "Expected a value greater than zero.",
);
const safeLabel = z.string().trim().min(1).max(80);
export const TelegramIdentifierSchema = z.string().regex(/^\d{1,32}$/, "Expected a positive Telegram identifier.");

export const TelegramConnectionStatusSchema = z.enum(["connected", "revoked", "blocked"]);
export const TelegramLinkTokenStatusSchema = z.enum(["pending", "consumed", "superseded", "expired"]);
export const TelegramDeliveryStatusSchema = z.enum(["pending", "processing", "sent", "failed", "cancelled"]);
export const TelegramDeliveryKindSchema = z.enum([
  "connection_receipt",
  "command_reply",
  "unlink_confirmation",
  "council_approved",
  "council_disputed",
  "council_blocked",
  "preview_ready",
  "preview_expiring",
  "goal_deadline",
  "option_expiry",
]);

export const TelegramConnectionSchema = z.object({
  id: UUIDSchema,
  ownerSessionHash: Sha256Schema,
  telegramUserId: TelegramIdentifierSchema,
  telegramChatId: TelegramIdentifierSchema,
  status: TelegramConnectionStatusSchema,
  timezone: z.string().trim().min(1).max(100),
  linkedAt: ISODateTimeSchema,
  lastInteractionAt: ISODateTimeSchema,
  revokedAt: ISODateTimeSchema.nullable(),
  createdAt: ISODateTimeSchema,
  updatedAt: ISODateTimeSchema,
}).strict().superRefine((connection, context) => {
  if (connection.status === "connected" && connection.revokedAt !== null) {
    context.addIssue({ code: "custom", path: ["revokedAt"], message: "Connected Telegram accounts cannot have a revocation time." });
  }
  if (connection.status !== "connected" && connection.revokedAt === null) {
    context.addIssue({ code: "custom", path: ["revokedAt"], message: "Revoked and blocked Telegram accounts require a revocation time." });
  }
});

export const TelegramLinkTokenSchema = z.object({
  id: UUIDSchema,
  ownerSessionHash: Sha256Schema,
  tokenHash: Sha256Schema,
  timezone: z.string().trim().min(1).max(100),
  status: TelegramLinkTokenStatusSchema,
  expiresAt: ISODateTimeSchema,
  consumedAt: ISODateTimeSchema.nullable(),
  createdAt: ISODateTimeSchema,
  updatedAt: ISODateTimeSchema,
}).strict().superRefine((token, context) => {
  if (token.status === "consumed" && token.consumedAt === null) {
    context.addIssue({ code: "custom", path: ["consumedAt"], message: "Consumed link tokens require a consumption time." });
  }
  if (token.status !== "consumed" && token.consumedAt !== null) {
    context.addIssue({ code: "custom", path: ["consumedAt"], message: "Only consumed link tokens may have a consumption time." });
  }
});

export const TelegramNotificationPreferencesSchema = z.object({
  connectionId: UUIDSchema,
  councilResults: z.boolean(),
  previewReady: z.boolean(),
  previewExpiring: z.boolean(),
  goalDeadlines: z.boolean(),
  optionExpiry: z.boolean(),
  createdAt: ISODateTimeSchema,
  updatedAt: ISODateTimeSchema,
}).strict();

export const TelegramGoalButtonTargetSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("new_goal") }).strict(),
  z.object({ type: z.literal("goal"), goalId: UUIDSchema }).strict(),
]);

export const TelegramCommandReplyPayloadSchema = z.object({
  kind: z.literal("command_reply"),
  text: z.string().trim().min(1).max(4096),
  button: z.object({
    label: z.string().trim().min(1).max(64),
    target: TelegramGoalButtonTargetSchema,
  }).strict().nullable(),
}).strict();

export const TelegramConnectionReceiptPayloadSchema = z.object({
  kind: z.literal("connection_receipt"),
  latestGoal: z.object({ label: safeLabel, status: GoalStatusSchema }).strict().nullable(),
}).strict();

export const TelegramUnlinkConfirmationPayloadSchema = z.object({
  kind: z.literal("unlink_confirmation"),
}).strict();

export const TelegramCouncilApprovedPayloadSchema = z.object({
  kind: z.literal("council_approved"),
  goalId: UUIDSchema,
  goalLabel: safeLabel,
  protectedValueUsd: positiveDecimal,
  approvedReviewCount: z.literal(3),
  premiumUsd: positiveDecimal,
  protectionEndsAt: ISODateTimeSchema,
}).strict();

export const TelegramCouncilDisputedPayloadSchema = z.object({
  kind: z.literal("council_disputed"),
  goalId: UUIDSchema,
  goalLabel: safeLabel,
  approvedReviewCount: z.number().int().min(0).max(3),
}).strict();

export const TelegramCouncilBlockedPayloadSchema = z.object({
  kind: z.literal("council_blocked"),
  goalId: UUIDSchema,
  goalLabel: safeLabel,
}).strict();

export const TelegramPreviewReadyPayloadSchema = z.object({
  kind: z.literal("preview_ready"),
  goalId: UUIDSchema,
  goalLabel: safeLabel,
  premiumUsd: positiveDecimal,
  previewExpiresAt: ISODateTimeSchema,
  coverageMode: CoverageModeSchema,
  goalCoverageBps: z.number().int().min(0).max(10000),
  settlementType: SettlementTypeSchema,
}).strict();

export const TelegramPreviewExpiringPayloadSchema = z.object({
  kind: z.literal("preview_expiring"),
  goalId: UUIDSchema,
  goalLabel: safeLabel,
  previewExpiresAt: ISODateTimeSchema,
}).strict();

export const TelegramGoalDeadlinePayloadSchema = z.object({
  kind: z.literal("goal_deadline"),
  goalId: UUIDSchema,
  goalLabel: safeLabel,
  deadline: ISODateSchema,
  leadDays: z.union([z.literal(7), z.literal(1)]),
}).strict();

export const TelegramOptionExpiryPayloadSchema = z.object({
  kind: z.literal("option_expiry"),
  goalId: UUIDSchema,
  candidateId: UUIDSchema,
  goalLabel: safeLabel,
  expiresAt: ISODateTimeSchema,
}).strict();

export const TelegramNotificationPayloadSchema = z.discriminatedUnion("kind", [
  TelegramCommandReplyPayloadSchema,
  TelegramConnectionReceiptPayloadSchema,
  TelegramUnlinkConfirmationPayloadSchema,
  TelegramCouncilApprovedPayloadSchema,
  TelegramCouncilDisputedPayloadSchema,
  TelegramCouncilBlockedPayloadSchema,
  TelegramPreviewReadyPayloadSchema,
  TelegramPreviewExpiringPayloadSchema,
  TelegramGoalDeadlinePayloadSchema,
  TelegramOptionExpiryPayloadSchema,
]);

export const TelegramNotificationDeliverySchema = z.object({
  id: UUIDSchema,
  connectionId: UUIDSchema.nullable(),
  telegramChatId: TelegramIdentifierSchema,
  kind: TelegramDeliveryKindSchema,
  goalId: UUIDSchema.nullable(),
  candidateId: UUIDSchema.nullable(),
  decisionId: UUIDSchema.nullable(),
  tradeId: UUIDSchema.nullable(),
  dedupeKey: z.string().trim().min(1).max(160),
  payload: TelegramNotificationPayloadSchema,
  status: TelegramDeliveryStatusSchema,
  attemptCount: z.number().int().nonnegative(),
  nextAttemptAt: ISODateTimeSchema,
  leaseUntil: ISODateTimeSchema.nullable(),
  telegramMessageId: TelegramIdentifierSchema.nullable(),
  lastErrorCode: z.string().regex(/^[A-Z0-9_:-]{1,64}$/).nullable(),
  createdAt: ISODateTimeSchema,
  updatedAt: ISODateTimeSchema,
  sentAt: ISODateTimeSchema.nullable(),
}).strict().superRefine((delivery, context) => {
  if (delivery.kind !== delivery.payload.kind) {
    context.addIssue({ code: "custom", path: ["kind"], message: "Delivery kind must match its payload kind." });
  }
  if (delivery.status === "sent" && (delivery.telegramMessageId === null || delivery.sentAt === null)) {
    context.addIssue({ code: "custom", path: ["status"], message: "Sent deliveries require Telegram message metadata." });
  }
  if (delivery.status === "processing" && delivery.leaseUntil === null) {
    context.addIssue({ code: "custom", path: ["leaseUntil"], message: "Processing deliveries require a lease." });
  }
});

export const TelegramWebhookUpdateSchema = z.object({
  updateId: TelegramIdentifierSchema,
  processedAt: ISODateTimeSchema,
}).strict();

// Telegram sends numeric identifiers as JSON numbers, but keeping the value as
// text after parsing avoids precision loss and gives persistence one canonical
// representation. Unknown envelope/message fields remain forward-compatible;
// only these validated fields may be copied into GoalGuard records.
const externalPositiveIdentifier = z.union([
  z.number().int().nonnegative().safe(),
  z.string().regex(/^\d{1,32}$/),
]).transform(String);
const externalChatIdentifier = z.union([
  z.number().int().safe(),
  z.string().regex(/^-?\d{1,32}$/),
]).transform(String);

export const TelegramUserSchema = z.object({
  id: externalPositiveIdentifier,
}).passthrough();

export const TelegramChatSchema = z.object({
  id: externalChatIdentifier,
  type: z.enum(["private", "group", "supergroup", "channel"]),
}).passthrough();

export const TelegramMessageSchema = z.object({
  message_id: externalPositiveIdentifier,
  from: TelegramUserSchema.optional(),
  chat: TelegramChatSchema,
  text: z.string().max(4096).optional(),
}).passthrough();

export const TelegramUpdateSchema = z.object({
  update_id: externalPositiveIdentifier,
  message: TelegramMessageSchema.optional(),
}).passthrough();

export const TelegramPrivateCommandSchema = z.object({
  updateId: TelegramIdentifierSchema,
  telegramUserId: TelegramIdentifierSchema,
  telegramChatId: TelegramIdentifierSchema,
  text: z.string().trim().min(1).max(4096),
}).strict();

export type TelegramConnectionStatus = z.infer<typeof TelegramConnectionStatusSchema>;
export type TelegramLinkToken = z.infer<typeof TelegramLinkTokenSchema>;
export type TelegramConnection = z.infer<typeof TelegramConnectionSchema>;
export type TelegramNotificationPreferences = z.infer<typeof TelegramNotificationPreferencesSchema>;
export type TelegramNotificationPayload = z.infer<typeof TelegramNotificationPayloadSchema>;
export type TelegramNotificationDelivery = z.infer<typeof TelegramNotificationDeliverySchema>;
export type TelegramDeliveryKind = z.infer<typeof TelegramDeliveryKindSchema>;
export type TelegramDeliveryStatus = z.infer<typeof TelegramDeliveryStatusSchema>;
export type TelegramWebhookUpdate = z.infer<typeof TelegramWebhookUpdateSchema>;
export type TelegramUpdate = z.infer<typeof TelegramUpdateSchema>;
export type TelegramPrivateCommand = z.infer<typeof TelegramPrivateCommandSchema>;
export type TelegramExternalChat = z.infer<typeof TelegramChatSchema>;
export type TelegramExternalMessage = z.infer<typeof TelegramMessageSchema>;
export type TelegramExternalUser = z.infer<typeof TelegramUserSchema>;
export type TelegramGoalButtonTarget = z.infer<typeof TelegramGoalButtonTargetSchema>;
export type TelegramConnectionReceiptPayload = z.infer<typeof TelegramConnectionReceiptPayloadSchema>;
export type TelegramCommandReplyPayload = z.infer<typeof TelegramCommandReplyPayloadSchema>;
export type TelegramUnlinkConfirmationPayload = z.infer<typeof TelegramUnlinkConfirmationPayloadSchema>;
export type TelegramCouncilApprovedPayload = z.infer<typeof TelegramCouncilApprovedPayloadSchema>;
export type TelegramCouncilDisputedPayload = z.infer<typeof TelegramCouncilDisputedPayloadSchema>;
export type TelegramCouncilBlockedPayload = z.infer<typeof TelegramCouncilBlockedPayloadSchema>;
export type TelegramPreviewReadyPayload = z.infer<typeof TelegramPreviewReadyPayloadSchema>;
export type TelegramPreviewExpiringPayload = z.infer<typeof TelegramPreviewExpiringPayloadSchema>;
export type TelegramGoalDeadlinePayload = z.infer<typeof TelegramGoalDeadlinePayloadSchema>;
export type TelegramOptionExpiryPayload = z.infer<typeof TelegramOptionExpiryPayloadSchema>;
