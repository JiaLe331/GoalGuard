import { describe, expect, it, vi } from "vitest";

import { fixtureCandidate, fixtureDecision, fixtureReadyGoal, fixtureTrade } from "@/test/fixtures/goalguard";

import type { TelegramConnection, TelegramNotificationDelivery, TelegramNotificationPreferences } from "./contracts";
import type { TelegramReminderTarget, TelegramRepository } from "./repository";
import { reconcileTelegramReminders } from "./scheduler";

const now = new Date("2026-09-05T08:00:00.000Z");
const connection: TelegramConnection = {
  id: "20000000-0000-4000-8000-000000000002",
  ownerSessionHash: "a".repeat(64),
  telegramUserId: "42",
  telegramChatId: "42",
  status: "connected",
  timezone: "Asia/Kuala_Lumpur",
  linkedAt: "2026-08-30T00:00:00.000Z",
  lastInteractionAt: "2026-08-30T00:00:00.000Z",
  revokedAt: null,
  createdAt: "2026-08-30T00:00:00.000Z",
  updatedAt: "2026-08-30T00:00:00.000Z",
};
const preferences: TelegramNotificationPreferences = {
  connectionId: connection.id,
  councilResults: true,
  previewReady: true,
  previewExpiring: true,
  goalDeadlines: true,
  optionExpiry: true,
  createdAt: connection.linkedAt,
  updatedAt: connection.linkedAt,
};

function target(): TelegramReminderTarget {
  return {
    connection,
    preferences,
    goals: [{
      goal: { ...fixtureReadyGoal, deadline: "2026-09-12" },
      candidate: { ...fixtureCandidate, expiry: "2026-09-05T20:00:00.000Z" },
      decision: fixtureDecision,
      trade: { ...fixtureTrade, previewExpiresAt: "2026-09-05T08:30:00.000Z" },
    }],
  };
}

function repositoryFor(currentTarget: TelegramReminderTarget, pending: TelegramNotificationDelivery[] = []) {
  const deliveries = new Map<string, TelegramNotificationDelivery>();
  const enqueue = vi.fn(async (input: { dedupeKey: string }) => {
    const value = { ...input, status: "pending" } as unknown as TelegramNotificationDelivery;
    deliveries.set(input.dedupeKey, value);
    return value;
  });
  const repository = {
    listTelegramReminderTargets: vi.fn(async () => [currentTarget]),
    getTelegramDeliveryByDedupeKey: vi.fn(async (key: string) => deliveries.get(key) ?? null),
    enqueueTelegramDelivery: enqueue,
    listPendingTelegramReminders: vi.fn(async () => pending),
    cancelTelegramDelivery: vi.fn(async () => undefined),
  } as unknown as TelegramRepository;
  return { repository, enqueue };
}

describe("Telegram reminder reconciliation", () => {
  it("creates bounded deadline, option-expiry, and lifecycle gaps idempotently", async () => {
    const state = repositoryFor(target());
    await expect(reconcileTelegramReminders(state.repository, now)).resolves.toMatchObject({ connectionsScanned: 1, deliveriesEnqueued: 5, deliveriesCancelled: 0 });
    expect(state.enqueue.mock.calls.map(([input]) => input.dedupeKey)).toEqual(expect.arrayContaining([
      `council:${fixtureDecision.id}`,
      `preview:${fixtureTrade.id}`,
      `preview-expiry:${fixtureTrade.id}`,
      "deadline:1b3e798c-e0e8-4ab5-9e37-d4526424eb8f:2026-09-12:7",
      `option-expiry:${fixtureCandidate.id}:2026-09-05T20:00:00.000Z`,
    ]));
    await expect(reconcileTelegramReminders(state.repository, now)).resolves.toMatchObject({ deliveriesEnqueued: 0 });
  });

  it("cancels queued reminders that are no longer desired", async () => {
    const stale = { id: "30000000-0000-4000-8000-000000000003", kind: "goal_deadline", dedupeKey: "deadline:old", status: "pending" } as unknown as TelegramNotificationDelivery;
    const state = repositoryFor({ ...target(), preferences: { ...preferences, goalDeadlines: false, optionExpiry: false, previewExpiring: false }, goals: [] }, [stale]);
    const result = await reconcileTelegramReminders(state.repository, now);
    expect(result.deliveriesCancelled).toBe(1);
    expect(state.repository.cancelTelegramDelivery).toHaveBeenCalledWith(stale.id);
  });
});
