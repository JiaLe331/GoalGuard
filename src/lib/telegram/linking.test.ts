import { describe, expect, it, vi } from "vitest";

import type { TelegramLinkToken } from "./contracts";
import {
  buildTelegramDeepLink,
  createTelegramLink,
  generateTelegramLinkToken,
  hashTelegramLinkToken,
  normalizeTelegramTimezone,
} from "./linking";
import type { TelegramRepository } from "./repository";

const configuration = {
  botUsername: "GoalGuardBot",
  webhookSecret: "telegram-secret",
  appUrl: "https://goalguard.example",
  linkTtlSeconds: 600,
};

describe("Telegram one-time linking", () => {
  it("generates a 256-bit deep-link parameter and stores only its hash", async () => {
    const token = generateTelegramLinkToken((size) => Uint8Array.from({ length: size }, (_, index) => index));
    expect(token).toHaveLength(43);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(hashTelegramLinkToken(token)).toHaveLength(64);
    expect(buildTelegramDeepLink(configuration.botUsername, token)).toBe(`https://t.me/GoalGuardBot?start=${token}`);

    const create = vi.fn(async (value: TelegramLinkToken) => value);
    const repository = { createTelegramLinkToken: create } as unknown as TelegramRepository;
    const now = new Date("2026-09-05T08:00:00.000Z");
    const result = await createTelegramLink({
      ownerSessionHash: "a".repeat(64),
      timezone: "Asia/Kuala_Lumpur",
      repository,
      configuration,
      now,
      randomBytesSource: (size) => Uint8Array.from({ length: size }, (_, index) => index),
    });

    expect(create).toHaveBeenCalledOnce();
    const stored = create.mock.calls[0]![0];
    expect(stored.tokenHash).toBe(hashTelegramLinkToken(token));
    expect(stored.tokenHash).not.toBe(token);
    expect(stored.timezone).toBe("Asia/Kuala_Lumpur");
    expect(stored.expiresAt).toBe("2026-09-05T08:10:00.000Z");
    expect(result).toEqual({ deepLink: `https://t.me/GoalGuardBot?start=${token}`, expiresAt: "2026-09-05T08:10:00.000Z" });
  });

  it("uses UTC for missing or invalid browser time zones", () => {
    expect(normalizeTelegramTimezone(undefined)).toBe("UTC");
    expect(normalizeTelegramTimezone("not/a-time-zone")).toBe("UTC");
    expect(normalizeTelegramTimezone(" Europe/Paris ")).toBe("Europe/Paris");
  });
});
