import { describe, expect, it } from "vitest";

import {
  CreateTelegramLinkResponseSchema,
  TelegramPublicConnectionStatusSchema,
} from "@/lib/contracts";
import {
  TelegramConnectionSchema,
  TelegramNotificationDeliverySchema,
  TelegramNotificationPayloadSchema,
  TelegramUpdateSchema,
} from "./contracts";

const goalId = "4b3e798c-e0e8-4ab5-9e37-d4526424eb8f";
const now = "2026-09-05T08:00:00.000Z";

describe("Telegram contracts", () => {
  it("normalizes external Telegram identifiers to text while accepting forward-compatible fields", () => {
    const update = TelegramUpdateSchema.parse({
      update_id: 123,
      future_update_field: { ignored: true },
      message: {
        message_id: 456,
        from: { id: 789, first_name: "Ada" },
        chat: { id: 789, type: "private", future_chat_field: "ignored" },
        text: "/status",
      },
    });
    expect(update.update_id).toBe("123");
    expect(update.message?.from?.id).toBe("789");
    expect(update.message?.chat.id).toBe("789");
  });

  it("keeps delivery payloads to an allowlisted deterministic shape", () => {
    const payload = TelegramNotificationPayloadSchema.parse({
      kind: "preview_ready",
      goalId,
      goalLabel: "Rent",
      premiumUsd: "2.50",
      previewExpiresAt: now,
      coverageMode: "full",
      goalCoverageBps: 10000,
      settlementType: "cash",
    });
    expect(payload.kind).toBe("preview_ready");
    expect(TelegramNotificationPayloadSchema.safeParse({ ...payload, walletAddress: "0x1111111111111111111111111111111111111111" }).success).toBe(false);
  });

  it("rejects mismatched delivery kinds and requires a lease for processing", () => {
    const base = {
      id: "6b3e798c-e0e8-4ab5-9e37-d4526424eb8f",
      connectionId: "7b3e798c-e0e8-4ab5-9e37-d4526424eb8f",
      telegramChatId: "789",
      kind: "preview_ready" as const,
      goalId,
      candidateId: null,
      decisionId: null,
      tradeId: null,
      dedupeKey: "preview-ready:trade-1",
      payload: {
        kind: "preview_ready" as const,
        goalId,
        goalLabel: "Rent",
        premiumUsd: "2.50",
        previewExpiresAt: now,
        coverageMode: "full" as const,
        goalCoverageBps: 10000,
        settlementType: "cash" as const,
      },
      status: "pending" as const,
      attemptCount: 0,
      nextAttemptAt: now,
      leaseUntil: null,
      telegramMessageId: null,
      lastErrorCode: null,
      createdAt: now,
      updatedAt: now,
      sentAt: null,
    };
    expect(TelegramNotificationDeliverySchema.safeParse(base).success).toBe(true);
    expect(TelegramNotificationDeliverySchema.safeParse({ ...base, kind: "goal_deadline" }).success).toBe(false);
    expect(TelegramNotificationDeliverySchema.safeParse({ ...base, status: "processing" }).success).toBe(false);
  });

  it("does not allow a revoked connection without a revocation timestamp", () => {
    expect(TelegramConnectionSchema.safeParse({
      id: "8b3e798c-e0e8-4ab5-9e37-d4526424eb8f",
      ownerSessionHash: "a".repeat(64),
      telegramUserId: "789",
      telegramChatId: "789",
      status: "revoked",
      timezone: "UTC",
      linkedAt: now,
      lastInteractionAt: now,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    }).success).toBe(false);
  });

  it("validates safe public connection and deep-link responses", () => {
    expect(TelegramPublicConnectionStatusSchema.parse({
      status: "paused",
      linkedAt: now,
      preferences: { councilResults: false, previewReady: false, previewExpiring: false, goalDeadlines: false, optionExpiry: false },
    }).status).toBe("paused");
    expect(CreateTelegramLinkResponseSchema.safeParse({
      data: { deepLink: "https://t.me/goalguardbot?start=" + "a".repeat(43), expiresAt: now },
      meta: { requestId: "9b3e798c-e0e8-4ab5-9e37-d4526424eb8f", timestamp: now },
    }).success).toBe(true);
    expect(CreateTelegramLinkResponseSchema.safeParse({
      data: { deepLink: "https://evil.example/?start=" + "a".repeat(43), expiresAt: now },
      meta: { requestId: "9b3e798c-e0e8-4ab5-9e37-d4526424eb8f", timestamp: now },
    }).success).toBe(false);
  });
});
