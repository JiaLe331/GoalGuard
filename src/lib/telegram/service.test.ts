import { describe, expect, it, vi } from "vitest";

import type { TelegramConnection, TelegramLinkToken, TelegramNotificationPreferences } from "./contracts";
import { TelegramUpdateSchema } from "./contracts";
import type { TelegramCommandProcessingInput, TelegramRepository, TelegramStartProcessingInput } from "./repository";
import { getTelegramPublicConnectionStatus, processTelegramUpdate } from "./service";

const owner = "a".repeat(64);
const now = new Date("2026-09-05T08:00:00.000Z");

const linkedConnection: TelegramConnection = {
  id: "20000000-0000-4000-8000-000000000002",
  ownerSessionHash: owner,
  telegramUserId: "42",
  telegramChatId: "42",
  status: "connected",
  timezone: "UTC",
  linkedAt: now.toISOString(),
  lastInteractionAt: now.toISOString(),
  revokedAt: null,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

const preferences: TelegramNotificationPreferences = {
  connectionId: linkedConnection.id,
  councilResults: true,
  previewReady: true,
  previewExpiring: false,
  goalDeadlines: true,
  optionExpiry: true,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

const token: TelegramLinkToken = {
  id: "10000000-0000-4000-8000-000000000001",
  ownerSessionHash: owner,
  tokenHash: "1".repeat(64),
  timezone: "UTC",
  status: "pending",
  expiresAt: "2026-09-05T08:10:00.000Z",
  consumedAt: null,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

function privateStart(tokenValue: string) {
  return TelegramUpdateSchema.parse({
    update_id: 7,
    message: { message_id: 8, from: { id: 42 }, chat: { id: 42, type: "private" }, text: `/start ${tokenValue}` },
  });
}

function privateMessage(text: string, updateId = 30) {
  return TelegramUpdateSchema.parse({
    update_id: updateId,
    message: { message_id: updateId + 1, from: { id: 42 }, chat: { id: 42, type: "private" }, text },
  });
}

describe("Telegram service", () => {
  it("returns only the safe public connection state", async () => {
    const repository = {
      getTelegramConnectionForOwner: vi.fn(async () => linkedConnection),
      getTelegramPreferences: vi.fn(async () => preferences),
    } as unknown as TelegramRepository;
    await expect(getTelegramPublicConnectionStatus(repository, owner)).resolves.toEqual({
      status: "connected",
      linkedAt: now.toISOString(),
      preferences: { councilResults: true, previewReady: true, previewExpiring: false, goalDeadlines: true, optionExpiry: true },
    });

    const pausedRepository = {
      getTelegramConnectionForOwner: vi.fn(async () => linkedConnection),
      getTelegramPreferences: vi.fn(async () => ({ ...preferences, councilResults: false, previewReady: false, goalDeadlines: false, optionExpiry: false })),
    } as unknown as TelegramRepository;
    await expect(getTelegramPublicConnectionStatus(pausedRepository, owner)).resolves.toMatchObject({ status: "paused" });

    const unavailable = { getTelegramConnectionForOwner: vi.fn() } as unknown as TelegramRepository;
    await expect(getTelegramPublicConnectionStatus(unavailable, owner, false)).resolves.toEqual({ status: "unavailable" });
    expect(unavailable.getTelegramConnectionForOwner).not.toHaveBeenCalled();
  });

  it("processes a private deep link without persisting the raw token", async () => {
    let capturedInput: TelegramStartProcessingInput | undefined;
    const process = vi.fn(async (input: TelegramStartProcessingInput) => {
      capturedInput = input;
      return { duplicate: false, connection: linkedConnection, preferences, delivery: null };
    });
    const repository = {
      getTelegramConnectionByChatId: vi.fn(async () => null),
      getTelegramLinkToken: vi.fn(async () => token),
      getLatestGoalForOwner: vi.fn(async () => null),
      processTelegramStart: process,
    } as unknown as TelegramRepository;
    const rawToken = "A".repeat(43);
    const result = await processTelegramUpdate(privateStart(rawToken), "GoalGuardBot", repository, now);
    expect(result).toEqual({ duplicate: false, ignored: false, linked: true });
    expect(process).toHaveBeenCalledOnce();
    const input = capturedInput!;
    expect(input.tokenHash).toBeTypeOf("string");
    expect(input.tokenHash).not.toBe(rawToken);
    expect(JSON.stringify(input)).not.toContain(rawToken);
    expect(input.successDelivery.payload).toEqual({ kind: "connection_receipt", latestGoal: null });
  });

  it("records groups and commands for another bot without linking or revealing data", async () => {
    const record = vi.fn(async () => true);
    const process = vi.fn();
    const repository = { recordTelegramWebhookUpdate: record, processTelegramStart: process } as unknown as TelegramRepository;
    const group = TelegramUpdateSchema.parse({ update_id: 20, message: { message_id: 21, from: { id: 22 }, chat: { id: -22, type: "group" }, text: "/start secret" } });
    await expect(processTelegramUpdate(group, "GoalGuardBot", repository, now)).resolves.toEqual({ duplicate: false, ignored: true, linked: false });
    await expect(processTelegramUpdate(TelegramUpdateSchema.parse({ update_id: 23, message: { message_id: 24, from: { id: 22 }, chat: { id: 22, type: "private" }, text: "/start@OtherBot secret" } }), "GoalGuardBot", repository, now)).resolves.toEqual({ duplicate: false, ignored: true, linked: false });
    expect(record).toHaveBeenCalledTimes(2);
    expect(process).not.toHaveBeenCalled();
  });

  it("uses a generic invalid-link reply for expired or already-used tokens", async () => {
    let capturedInput: TelegramStartProcessingInput | undefined;
    const process = vi.fn(async (input: TelegramStartProcessingInput) => {
      capturedInput = input;
      return { duplicate: false, connection: null, preferences: null, delivery: null };
    });
    const repository = {
      getTelegramConnectionByChatId: vi.fn(async () => null),
      getTelegramLinkToken: vi.fn(async () => ({ ...token, status: "expired" as const })),
      processTelegramStart: process,
    } as unknown as TelegramRepository;
    await processTelegramUpdate(privateStart("B".repeat(43)), "GoalGuardBot", repository, now);
    const fallback = capturedInput!.fallbackDelivery.payload;
    expect(fallback).toMatchObject({ kind: "command_reply" });
    if (fallback.kind === "command_reply") expect(fallback.text).toContain("invalid or expired");
  });

  it("handles status, alert toggles, stop, and unlink without an LLM", async () => {
    const inputs: TelegramCommandProcessingInput[] = [];
    const process = vi.fn(async (input: TelegramCommandProcessingInput) => {
      inputs.push(input);
      return { duplicate: false, connection: input.action === "unlink" ? { ...linkedConnection, status: "revoked" as const, revokedAt: now.toISOString() } : linkedConnection, preferences, delivery: null };
    });
    const repository = {
      getTelegramConnectionByChatId: vi.fn(async () => linkedConnection),
      getLatestGoalForOwner: vi.fn(async () => null),
      listGoalsForOwner: vi.fn(async () => []),
      getTelegramPreferences: vi.fn(async () => preferences),
      processTelegramCommand: process,
    } as unknown as TelegramRepository;

    await processTelegramUpdate(privateMessage("/status", 31), "GoalGuardBot", repository, now);
    expect(inputs[0]!.action).toBe("reply");
    expect(inputs[0]!.delivery.payload).toMatchObject({ kind: "command_reply" });
    if (inputs[0]!.delivery.payload.kind === "command_reply") expect(inputs[0]!.delivery.payload.text).toContain("No GoalGuard goals");

    await processTelegramUpdate(privateMessage("/alerts council off", 32), "GoalGuardBot", repository, now);
    expect(inputs[1]).toMatchObject({ action: "preferences", preferenceValues: { councilResults: false, previewReady: true, previewExpiring: false, goalDeadlines: true, optionExpiry: true } });

    await processTelegramUpdate(privateMessage("/stop", 33), "GoalGuardBot", repository, now);
    expect(inputs[2]).toMatchObject({ action: "preferences", preferenceValues: { councilResults: false, previewReady: false, previewExpiring: false, goalDeadlines: false, optionExpiry: false } });

    await processTelegramUpdate(privateMessage("/unlink", 34), "GoalGuardBot", repository, now);
    expect(inputs[3]!.action).toBe("unlink");
    expect(inputs[3]!.delivery.payload).toEqual({ kind: "unlink_confirmation" });
  });
});
