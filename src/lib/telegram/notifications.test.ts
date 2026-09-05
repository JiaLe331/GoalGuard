import { describe, expect, it, vi } from "vitest";

import { TelegramNotificationDeliverySchema } from "./contracts";
import { TelegramApiError, type TelegramBotClient } from "./client";
import type { TelegramRepository } from "./repository";
import { deliverTelegramNotifications } from "./notifications";

const now = new Date("2026-09-05T08:00:00.000Z");

function delivery(attemptCount = 1) {
  return TelegramNotificationDeliverySchema.parse({
    id: "40000000-0000-4000-8000-000000000004",
    connectionId: "20000000-0000-4000-8000-000000000002",
    telegramChatId: "42",
    kind: "preview_ready",
    goalId: "4b3e798c-e0e8-4ab5-9e37-d4526424eb8f",
    candidateId: "2b3e798c-e0e8-4ab5-9e37-d4526424eb8f",
    decisionId: "3b3e798c-e0e8-4ab5-9e37-d4526424eb8f",
    tradeId: "5b3e798c-e0e8-4ab5-9e37-d4526424eb8f",
    dedupeKey: "preview:test",
    payload: { kind: "preview_ready", goalId: "4b3e798c-e0e8-4ab5-9e37-d4526424eb8f", goalLabel: "Rent", premiumUsd: "2.5", previewExpiresAt: "2099-09-30T08:00:00.000Z", coverageMode: "full", goalCoverageBps: 10000, settlementType: "cash" },
    status: "processing",
    attemptCount,
    nextAttemptAt: now.toISOString(),
    leaseUntil: "2026-09-05T08:01:00.000Z",
    telegramMessageId: null,
    lastErrorCode: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    sentAt: null,
  });
}

function stateFor(row = delivery()) {
  const sendMessage = vi.fn(async () => ({ message_id: "99" }));
  const repository = {
    claimTelegramDeliveries: vi.fn(async () => [row]),
    isTelegramDeliverySendable: vi.fn(async () => true),
    markTelegramDeliverySent: vi.fn(async () => undefined),
    cancelTelegramDelivery: vi.fn(async () => undefined),
    blockTelegramConnection: vi.fn(async () => null),
    rescheduleTelegramDelivery: vi.fn(async () => undefined),
    failTelegramDelivery: vi.fn(async () => undefined),
  } as unknown as TelegramRepository;
  const client = { appUrl: "https://goalguard.example", sendMessage } as unknown as TelegramBotClient;
  return { repository, client, sendMessage };
}

describe("Telegram leased delivery", () => {
  it("renders and sends a validated delivery, then records Telegram's message ID", async () => {
    const state = stateFor();
    await expect(deliverTelegramNotifications(state.repository, state.client, now)).resolves.toMatchObject({ claimed: 1, sent: 1 });
    expect(state.sendMessage).toHaveBeenCalledWith("42", expect.stringContaining("Protection Plan Ready (Demo)"), expect.objectContaining({ inline_keyboard: expect.any(Array) }));
    expect(state.repository.markTelegramDeliverySent).toHaveBeenCalledWith(expect.any(String), "99", now.toISOString());
  });

  it("cancels stale work and uses validated Telegram retry hints", async () => {
    const stale = stateFor();
    vi.mocked(stale.repository.isTelegramDeliverySendable).mockResolvedValue(false);
    await expect(deliverTelegramNotifications(stale.repository, stale.client, now)).resolves.toMatchObject({ cancelled: 1, sent: 0 });
    expect(stale.repository.cancelTelegramDelivery).toHaveBeenCalledOnce();

    const rateLimited = stateFor();
    vi.mocked(rateLimited.client.sendMessage).mockRejectedValue(new TelegramApiError("rate_limited", 429, 12, 429));
    await expect(deliverTelegramNotifications(rateLimited.repository, rateLimited.client, now)).resolves.toMatchObject({ retried: 1 });
    expect(rateLimited.repository.rescheduleTelegramDelivery).toHaveBeenCalledWith(expect.any(String), "2026-09-05T08:00:12.000Z", "TELEGRAM_RATE_LIMIT");
  });

  it("blocks a connection on a validated permanent Telegram block", async () => {
    const state = stateFor();
    vi.mocked(state.client.sendMessage).mockRejectedValue(new TelegramApiError("blocked", 403, null, 403));
    await expect(deliverTelegramNotifications(state.repository, state.client, now)).resolves.toMatchObject({ blocked: 1 });
    expect(state.repository.blockTelegramConnection).toHaveBeenCalledWith("20000000-0000-4000-8000-000000000002", now.toISOString());
    expect(state.repository.cancelTelegramDelivery).toHaveBeenCalledOnce();
  });
});
