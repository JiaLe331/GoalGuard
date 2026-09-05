import "server-only";

import { randomUUID } from "node:crypto";

import {
  councilNotificationPayload,
  goalLabel,
  previewExpiringNotificationPayload,
  previewReadyNotificationPayload,
  safeTelegramLabel,
} from "./messages";
import type { TelegramDeliveryEnqueueInput, TelegramRepository, TelegramReminderTarget } from "./repository";

const DAY_MS = 24 * 60 * 60 * 1000;
const reminderDeliveryKinds = new Set(["preview_expiring", "goal_deadline", "option_expiry"]);

function localDateParts(now: Date, timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      calendar: "gregory",
      numberingSystem: "latn",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const values = Object.fromEntries(parts.filter(({ type }) => type !== "literal").map(({ type, value }) => [type, value]));
    return { date: `${values.year}-${values.month}-${values.day}`, hour: Number(values.hour), minute: Number(values.minute) };
  } catch {
    return localDateParts(now, "UTC");
  }
}

function shiftedDate(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day! - days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function deadlineDue(deadline: string, leadDays: 7 | 1, timezone: string, now: Date) {
  const local = localDateParts(now, timezone);
  return local.date === shiftedDate(deadline, leadDays) && local.hour >= 9;
}

function ensureInput(
  target: TelegramReminderTarget,
  input: Omit<TelegramDeliveryEnqueueInput, "id" | "connectionId" | "telegramChatId" | "createdAt"> & { createdAt: string },
): TelegramDeliveryEnqueueInput {
  return {
    ...input,
    id: randomUUID(),
    connectionId: target.connection.id,
    telegramChatId: target.connection.telegramChatId,
  };
}

async function ensureDelivery(repository: TelegramRepository, input: TelegramDeliveryEnqueueInput) {
  if (await repository.getTelegramDeliveryByDedupeKey(input.dedupeKey)) return false;
  await repository.enqueueTelegramDelivery(input);
  return true;
}

function lifecycleInputs(target: TelegramReminderTarget, now: Date) {
  const inputs: TelegramDeliveryEnqueueInput[] = [];
  const nowIso = now.toISOString();
  for (const record of target.goals) {
    const { goal, candidate, decision, trade } = record;
    if (target.preferences.councilResults && decision && candidate && Date.parse(decision.createdAt) >= Date.parse(target.connection.linkedAt)) {
      inputs.push(ensureInput(target, {
        kind: councilNotificationPayload(decision, goal, candidate).kind,
        goalId: goal.id,
        candidateId: candidate.id,
        decisionId: decision.id,
        dedupeKey: `council:${decision.id}`,
        payload: councilNotificationPayload(decision, goal, candidate),
        nextAttemptAt: decision.createdAt,
        createdAt: decision.createdAt,
      }));
    }
    if (trade?.status === "previewed" && candidate && Date.parse(trade.createdAt) >= Date.parse(target.connection.linkedAt)) {
      if (target.preferences.previewReady) {
        inputs.push(ensureInput(target, {
          kind: "preview_ready",
          goalId: goal.id,
          candidateId: candidate.id,
          decisionId: trade.councilDecisionId,
          tradeId: trade.id,
          dedupeKey: `preview:${trade.id}`,
          payload: previewReadyNotificationPayload(trade, goal, candidate),
          nextAttemptAt: trade.createdAt,
          createdAt: trade.createdAt,
        }));
      }
      if (target.preferences.previewExpiring && Date.parse(trade.previewExpiresAt) > now.getTime()) {
        inputs.push(ensureInput(target, {
          kind: "preview_expiring",
          goalId: goal.id,
          candidateId: candidate.id,
          decisionId: trade.councilDecisionId,
          tradeId: trade.id,
          dedupeKey: `preview-expiry:${trade.id}`,
          payload: previewExpiringNotificationPayload(trade, goal),
          nextAttemptAt: new Date(Date.parse(trade.previewExpiresAt) - 30_000).toISOString(),
          createdAt: trade.createdAt,
        }));
      }
    }
    if (target.preferences.goalDeadlines && goal.status !== "failed") {
      for (const leadDays of [7, 1] as const) {
        if (!deadlineDue(goal.deadline, leadDays, target.connection.timezone, now)) continue;
        inputs.push(ensureInput(target, {
          kind: "goal_deadline",
          goalId: goal.id,
          dedupeKey: `deadline:${goal.id}:${goal.deadline}:${leadDays}`,
          payload: { kind: "goal_deadline", goalId: goal.id, goalLabel: safeTelegramLabel(goalLabel(goal)), deadline: goal.deadline, leadDays },
          nextAttemptAt: nowIso,
          createdAt: nowIso,
        }));
      }
    }
    if (target.preferences.optionExpiry && goal.status === "ready" && candidate?.status === "selected" && decision?.status === "approved" && Date.parse(candidate.expiry) > now.getTime() && Date.parse(candidate.expiry) <= now.getTime() + DAY_MS) {
      inputs.push(ensureInput(target, {
        kind: "option_expiry",
        goalId: goal.id,
        candidateId: candidate.id,
        decisionId: decision.id,
        dedupeKey: `option-expiry:${candidate.id}:${candidate.expiry}`,
        payload: { kind: "option_expiry", goalId: goal.id, candidateId: candidate.id, goalLabel: safeTelegramLabel(goalLabel(goal)), expiresAt: candidate.expiry },
        nextAttemptAt: nowIso,
        createdAt: nowIso,
      }));
    }
  }
  return inputs;
}

export interface TelegramReminderReconciliationResult {
  connectionsScanned: number;
  deliveriesEnqueued: number;
  deliveriesCancelled: number;
}

export async function reconcileTelegramReminders(repository: TelegramRepository, now = new Date(), limit = 100): Promise<TelegramReminderReconciliationResult> {
  const targets = await repository.listTelegramReminderTargets(limit);
  let deliveriesEnqueued = 0;
  let deliveriesCancelled = 0;
  for (const target of targets) {
    const desiredKeys = new Set<string>();
    for (const input of lifecycleInputs(target, now)) {
      if (input.kind === "preview_expiring" || input.kind === "goal_deadline" || input.kind === "option_expiry") desiredKeys.add(input.dedupeKey);
      if (await ensureDelivery(repository, input)) deliveriesEnqueued += 1;
    }
    const pendingReminders = await repository.listPendingTelegramReminders(target.connection.id, 100);
    for (const delivery of pendingReminders) {
      if (!reminderDeliveryKinds.has(delivery.kind) || !desiredKeys.has(delivery.dedupeKey)) {
        await repository.cancelTelegramDelivery(delivery.id);
        deliveriesCancelled += 1;
      }
    }
  }
  return { connectionsScanned: targets.length, deliveriesEnqueued, deliveriesCancelled };
}
