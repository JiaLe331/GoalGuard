import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";
import { isTelegramWebhookSecretValid } from "@/lib/telegram/webhook";

const environment = {
  TELEGRAM_NOTIFICATIONS_ENABLED: "true",
  TELEGRAM_BOT_USERNAME: "GoalGuardBot",
  TELEGRAM_WEBHOOK_SECRET: "telegram-secret",
  DATABASE_URL: "postgres://localhost/goalguard",
  NEXT_PUBLIC_APP_URL: "https://goalguard.example",
};

function stubEnvironment() {
  for (const [name, value] of Object.entries(environment)) vi.stubEnv(name, value);
}

afterEach(() => vi.unstubAllEnvs());

describe("Telegram webhook boundary", () => {
  it("compares webhook secrets without exposing a mismatch", () => {
    expect(isTelegramWebhookSecretValid("telegram-secret", "telegram-secret")).toBe(true);
    expect(isTelegramWebhookSecretValid("telegram-secret", "wrong-secret")).toBe(false);
    expect(isTelegramWebhookSecretValid("telegram-secret", null)).toBe(false);
  });

  it("rejects a wrong secret before reading an invalid body", async () => {
    stubEnvironment();
    const response = await POST(new Request("https://goalguard.example/api/integrations/telegram/webhook", {
      method: "POST",
      headers: { "x-telegram-bot-api-secret-token": "wrong-secret", "content-type": "application/json" },
      body: "not-json",
    }));
    expect(response.status).toBe(401);
  });

  it("rejects oversized and malformed authenticated updates", async () => {
    stubEnvironment();
    const oversized = await POST(new Request("https://goalguard.example/api/integrations/telegram/webhook", {
      method: "POST",
      headers: { "x-telegram-bot-api-secret-token": "telegram-secret", "content-length": "65537" },
      body: "{}",
    }));
    expect(oversized.status).toBe(413);

    const malformed = await POST(new Request("https://goalguard.example/api/integrations/telegram/webhook", {
      method: "POST",
      headers: { "x-telegram-bot-api-secret-token": "telegram-secret", "content-type": "application/json" },
      body: "{}",
    }));
    expect(malformed.status).toBe(400);
  });
});
