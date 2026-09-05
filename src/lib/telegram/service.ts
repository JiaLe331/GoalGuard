import "server-only";

import { randomUUID } from "node:crypto";

import {
  TelegramPublicConnectionStatusSchema,
  type GetTelegramConnectionResponse,
  type TelegramPublicConnectionStatus,
  type TelegramPublicPreferences,
} from "@/lib/contracts";

import type {
  TelegramNotificationPayload,
  TelegramNotificationPreferences,
} from "./contracts";
import { TelegramUpdateSchema, TelegramWebhookUpdateSchema } from "./contracts";
import { parseTelegramCommand, privateTelegramCommand } from "./commands";
import { hashTelegramLinkToken } from "./linking";
import {
  connectionReceiptPayload,
  renderAlerts,
  renderGoals,
  renderStatus,
  TELEGRAM_HELP_TEXT,
  TELEGRAM_ALERTS_UPDATED_TEXT,
  TELEGRAM_BLOCKED_TEXT,
  TELEGRAM_CONNECTED_REQUIRED_TEXT,
  TELEGRAM_INVALID_LINK_TEXT,
  TELEGRAM_STOPPED_TEXT,
  TELEGRAM_START_WEBSITE_TEXT,
  TELEGRAM_UNLINKED_TEXT,
} from "./messages";
import type { TelegramCommandProcessingInput, TelegramDeliveryEnqueueInput, TelegramNotificationPreferenceValues, TelegramRepository } from "./repository";

type PublicTelegramPreferences = Pick<TelegramNotificationPreferences, "councilResults" | "previewReady" | "previewExpiring" | "goalDeadlines" | "optionExpiry">;

export function publicTelegramPreferences(preferences: PublicTelegramPreferences): TelegramPublicPreferences {
  return {
    councilResults: preferences.councilResults,
    previewReady: preferences.previewReady,
    previewExpiring: preferences.previewExpiring,
    goalDeadlines: preferences.goalDeadlines,
    optionExpiry: preferences.optionExpiry,
  };
}

export async function getTelegramPublicConnectionStatus(
  repository: TelegramRepository,
  ownerSessionHash: string,
  available = true,
): Promise<TelegramPublicConnectionStatus> {
  if (!available) return { status: "unavailable" };

  const connection = await repository.getTelegramConnectionForOwner(ownerSessionHash);
  if (!connection) return { status: "disconnected" };
  if (connection.status === "blocked") return { status: "blocked" };

  const preferences = await repository.getTelegramPreferences(connection.id);
  if (!preferences) throw new Error("Telegram connection preferences are missing.");
  const publicPreferences = publicTelegramPreferences(preferences);
  const status = Object.values(publicPreferences).every((value) => !value) ? "paused" : "connected";
  return TelegramPublicConnectionStatusSchema.parse({ status, linkedAt: connection.linkedAt, preferences: publicPreferences });
}

export function telegramConnectionResponse(status: TelegramPublicConnectionStatus, meta: GetTelegramConnectionResponse["meta"]): GetTelegramConnectionResponse {
  return { data: TelegramPublicConnectionStatusSchema.parse(status), meta };
}

function commandReplyPayload(text: string): Extract<TelegramNotificationPayload, { kind: "command_reply" }> {
  return { kind: "command_reply", text, button: { label: "Open GoalGuard", target: { type: "new_goal" } } };
}

function delivery(
  input: Pick<TelegramDeliveryEnqueueInput, "connectionId" | "telegramChatId" | "kind" | "payload" | "dedupeKey"> & { id: string; now: string },
): TelegramDeliveryEnqueueInput {
  return {
    id: input.id,
    connectionId: input.connectionId,
    telegramChatId: input.telegramChatId,
    kind: input.kind,
    dedupeKey: input.dedupeKey,
    payload: input.payload,
    nextAttemptAt: input.now,
    createdAt: input.now,
  };
}

function fallbackText(command: ReturnType<typeof parseTelegramCommand>) {
  if (command.kind !== "start") return TELEGRAM_HELP_TEXT;
  return command.token === null && !command.malformed ? TELEGRAM_START_WEBSITE_TEXT : TELEGRAM_INVALID_LINK_TEXT;
}

function preferencesForAlertToggle(preferences: TelegramNotificationPreferences, args: string[]): TelegramNotificationPreferenceValues | null {
  if (args.length !== 2 || !["on", "off"].includes(args[1]!.toLowerCase())) return null;
  const key = {
    council: "councilResults",
    preview: "previewReady",
    "preview-expiry": "previewExpiring",
    deadline: "goalDeadlines",
    "option-expiry": "optionExpiry",
  }[args[0]!.toLowerCase()];
  if (!key) return null;
  return { ...publicTelegramPreferences(preferences), [key]: args[1]!.toLowerCase() === "on" };
}

function commandDelivery(
  connectionId: string | null,
  telegramChatId: string,
  updateId: string,
  payload: TelegramNotificationPayload,
  now: string,
): TelegramDeliveryEnqueueInput {
  return delivery({
    id: randomUUID(),
    connectionId,
    telegramChatId,
    kind: payload.kind,
    dedupeKey: `command:${updateId}`,
    payload,
    now,
  });
}

async function processNonStartCommand(
  privateCommand: NonNullable<ReturnType<typeof privateTelegramCommand>>,
  command: Exclude<ReturnType<typeof parseTelegramCommand>, { kind: "start" } | { kind: "ignore" }>,
  repository: TelegramRepository,
  now: Date,
): Promise<TelegramUpdateProcessingResult> {
  const processedAt = now.toISOString();
  const existing = await repository.getTelegramConnectionByChatId(privateCommand.telegramChatId);
  const isConnected = existing?.status === "connected";
  let action: TelegramCommandProcessingInput["action"] = "reply";
  let preferenceValues: TelegramNotificationPreferenceValues | undefined;
  let payload: TelegramNotificationPayload;

  if (command.kind === "help" || command.kind === "unknown") {
    payload = commandReplyPayload(TELEGRAM_HELP_TEXT);
  } else if (!existing) {
    payload = commandReplyPayload(command.kind === "unlink" ? TELEGRAM_UNLINKED_TEXT : TELEGRAM_CONNECTED_REQUIRED_TEXT);
  } else if (!isConnected) {
    payload = commandReplyPayload(TELEGRAM_BLOCKED_TEXT);
  } else if (command.kind === "status") {
    payload = commandReplyPayload(renderStatus(await repository.getLatestGoalForOwner(existing.ownerSessionHash)));
  } else if (command.kind === "goals") {
    payload = commandReplyPayload(renderGoals(await repository.listGoalsForOwner(existing.ownerSessionHash, 5)));
  } else if (command.kind === "alerts") {
    const preferences = await repository.getTelegramPreferences(existing.id);
    if (!preferences) throw new Error("Telegram connection preferences are missing.");
    const next = preferencesForAlertToggle(preferences, command.args);
    if (command.args.length > 0 && !next) {
      payload = commandReplyPayload(`I couldn't parse that alert setting.\n\n${renderAlerts(preferences)}`);
    } else if (next) {
      action = "preferences";
      preferenceValues = next;
      payload = commandReplyPayload(TELEGRAM_ALERTS_UPDATED_TEXT);
    } else {
      payload = commandReplyPayload(renderAlerts(preferences));
    }
  } else if (command.kind === "stop") {
    if (command.args.length > 0) {
      payload = commandReplyPayload(TELEGRAM_HELP_TEXT);
    } else {
      action = "preferences";
      preferenceValues = { councilResults: false, previewReady: false, previewExpiring: false, goalDeadlines: false, optionExpiry: false };
      payload = commandReplyPayload(TELEGRAM_STOPPED_TEXT);
    }
  } else if (command.kind === "unlink") {
    if (command.args.length > 0) {
      payload = commandReplyPayload(TELEGRAM_HELP_TEXT);
    } else {
      action = "unlink";
      payload = { kind: "unlink_confirmation" };
    }
  } else {
    payload = commandReplyPayload(TELEGRAM_HELP_TEXT);
  }

  const result = await repository.processTelegramCommand({
    update: TelegramWebhookUpdateSchema.parse({ updateId: privateCommand.updateId, processedAt }),
    action,
    connectionId: existing?.id ?? null,
    preferenceValues,
    delivery: commandDelivery(existing?.id ?? null, privateCommand.telegramChatId, privateCommand.updateId, payload, processedAt),
    now: processedAt,
  });
  return { duplicate: result.duplicate, ignored: false, linked: false };
}

async function latestGoalForPendingToken(repository: TelegramRepository, tokenHash: string | null, now: Date) {
  if (!tokenHash) return null;
  const token = await repository.getTelegramLinkToken(tokenHash);
  if (!token || token.status !== "pending" || Date.parse(token.expiresAt) <= now.getTime()) return null;
  return repository.getLatestGoalForOwner(token.ownerSessionHash);
}

export interface TelegramUpdateProcessingResult {
  duplicate: boolean;
  ignored: boolean;
  linked: boolean;
}

export async function processTelegramUpdate(
  update: unknown,
  botUsername: string,
  repository: TelegramRepository,
  now = new Date(),
): Promise<TelegramUpdateProcessingResult> {
  const value = TelegramUpdateSchema.parse(update);
  const processedAt = now.toISOString();
  const privateCommand = privateTelegramCommand(value);

  if (!privateCommand) {
    const recorded = await repository.recordTelegramWebhookUpdate(TelegramWebhookUpdateSchema.parse({ updateId: value.update_id, processedAt }));
    return { duplicate: !recorded, ignored: true, linked: false };
  }

  const command = parseTelegramCommand(privateCommand.text, botUsername);
  if (command.kind === "ignore") {
    const recorded = await repository.recordTelegramWebhookUpdate(TelegramWebhookUpdateSchema.parse({ updateId: privateCommand.updateId, processedAt }));
    return { duplicate: !recorded, ignored: true, linked: false };
  }

  if (command.kind !== "start") return processNonStartCommand(privateCommand, command, repository, now);

  const tokenHash = !command.malformed && command.token !== null ? hashTelegramLinkToken(command.token) : null;
  const existing = await repository.getTelegramConnectionByChatId(privateCommand.telegramChatId);
  const latestGoal = await latestGoalForPendingToken(repository, tokenHash, now);
  const connectionId = randomUUID();
  const successDelivery = delivery({
    id: randomUUID(),
    connectionId,
    telegramChatId: privateCommand.telegramChatId,
    kind: "connection_receipt",
    dedupeKey: `connection:${connectionId}`,
    payload: connectionReceiptPayload(latestGoal),
    now: processedAt,
  });
  const fallbackDelivery = delivery({
    id: randomUUID(),
    connectionId: existing?.id ?? null,
    telegramChatId: privateCommand.telegramChatId,
    kind: "command_reply",
    dedupeKey: `command:${privateCommand.updateId}`,
    payload: commandReplyPayload(fallbackText(command)),
    now: processedAt,
  });

  const result = await repository.processTelegramStart({
    update: TelegramWebhookUpdateSchema.parse({ updateId: privateCommand.updateId, processedAt }),
    tokenHash,
    telegramUserId: privateCommand.telegramUserId,
    telegramChatId: privateCommand.telegramChatId,
    connectionId,
    successDelivery,
    fallbackDelivery,
    now: processedAt,
  });
  if (!result.duplicate && !result.connection && existing) await repository.touchTelegramConnection(existing.id, processedAt);
  return { duplicate: result.duplicate, ignored: false, linked: result.connection !== null };
}
