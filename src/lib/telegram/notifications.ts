import "server-only";

import { buildTelegramReplyMarkup, TelegramApiError, TelegramBotClient } from "./client";
import type { TelegramGoalButtonTarget, TelegramNotificationPayload } from "./contracts";
import { renderTelegramPayload } from "./messages";
import type { TelegramRepository } from "./repository";

const retryDelaysMs = [30_000, 120_000, 600_000, 3_600_000] as const;

interface TelegramButton {
  label: string;
  target: TelegramGoalButtonTarget;
}

function buttonForPayload(payload: TelegramNotificationPayload): TelegramButton | null {
  if (payload.kind === "command_reply") return payload.button;
  if (payload.kind === "connection_receipt") return null;
  if (payload.kind === "unlink_confirmation") return null;
  if (payload.kind === "council_approved") return { label: "Review plan", target: { type: "goal", goalId: payload.goalId } };
  if (payload.kind === "council_disputed" || payload.kind === "council_blocked") return { label: "View council record", target: { type: "goal", goalId: payload.goalId } };
  if (payload.kind === "preview_ready") return { label: "View unsigned preview", target: { type: "goal", goalId: payload.goalId } };
  if (payload.kind === "preview_expiring") return { label: "Generate a fresh preview", target: { type: "goal", goalId: payload.goalId } };
  if (payload.kind === "goal_deadline") return { label: "Review goal", target: { type: "goal", goalId: payload.goalId } };
  return { label: "Review demo plan", target: { type: "goal", goalId: payload.goalId } };
}

function retryCode(error: TelegramApiError) {
  return error.category === "rate_limited" ? "TELEGRAM_RATE_LIMIT" : error.category === "server" ? "TELEGRAM_SERVER" : error.category === "network" ? "TELEGRAM_NETWORK" : error.category === "timeout" ? "TELEGRAM_TIMEOUT" : "TELEGRAM_CLIENT";
}

export interface TelegramDeliveryRunOptions {
  limit?: number;
  leaseMs?: number;
}

export interface TelegramDeliveryRunResult {
  claimed: number;
  sent: number;
  cancelled: number;
  retried: number;
  failed: number;
  blocked: number;
}

export async function deliverTelegramNotifications(
  repository: TelegramRepository,
  client: TelegramBotClient,
  now = new Date(),
  options: TelegramDeliveryRunOptions = {},
): Promise<TelegramDeliveryRunResult> {
  const nowIso = now.toISOString();
  const deliveries = await repository.claimTelegramDeliveries({ now: nowIso, limit: options.limit, leaseMs: options.leaseMs });
  const result: TelegramDeliveryRunResult = { claimed: deliveries.length, sent: 0, cancelled: 0, retried: 0, failed: 0, blocked: 0 };
  for (const delivery of deliveries) {
    try {
      if (!await repository.isTelegramDeliverySendable(delivery, nowIso)) {
        await repository.cancelTelegramDelivery(delivery.id);
        result.cancelled += 1;
        continue;
      }
      const button = buttonForPayload(delivery.payload);
      const markup = button ? buildTelegramReplyMarkup(client.appUrl, button.target, button.label) : undefined;
      const sent = await client.sendMessage(delivery.telegramChatId, renderTelegramPayload(delivery.payload), markup);
      await repository.markTelegramDeliverySent(delivery.id, sent.message_id, nowIso);
      result.sent += 1;
    } catch (error) {
      if (error instanceof TelegramApiError && error.category === "blocked") {
        if (delivery.connectionId) await repository.blockTelegramConnection(delivery.connectionId, nowIso);
        await repository.cancelTelegramDelivery(delivery.id);
        result.blocked += 1;
        continue;
      }
      const telegramError = error instanceof TelegramApiError ? error : null;
      const delay = telegramError?.category === "rate_limited" && telegramError.retryAfterSeconds !== null
        ? telegramError.retryAfterSeconds * 1000
        : retryDelaysMs[delivery.attemptCount - 1];
      if (delay !== undefined && (telegramError === null || telegramError.category === "rate_limited" || telegramError.category === "server" || telegramError.category === "network" || telegramError.category === "timeout")) {
        await repository.rescheduleTelegramDelivery(delivery.id, new Date(now.getTime() + delay).toISOString(), telegramError ? retryCode(telegramError) : "TELEGRAM_INTERNAL");
        result.retried += 1;
      } else {
        await repository.failTelegramDelivery(delivery.id, telegramError ? retryCode(telegramError) : "TELEGRAM_INTERNAL");
        result.failed += 1;
      }
    }
  }
  return result;
}
