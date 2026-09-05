import { describe, expect, it, vi } from "vitest";

import { buildTelegramReplyMarkup, TelegramApiError, TelegramBotClient } from "./client";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("Telegram Bot API client", () => {
  it("validates responses and keeps the bot token in the request only", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => response({ ok: true, result: { id: 123, is_bot: true, username: "GoalGuardBot" } }));
    const client = new TelegramBotClient({ botToken: "secret-token", appUrl: "https://goalguard.example", fetchImpl });
    await expect(client.getMe()).resolves.toEqual({ id: "123", username: "GoalGuardBot" });
    expect(String(fetchImpl.mock.calls[0]![0])).toContain("https://api.telegram.org/botsecret-token/getMe");
  });

  it("classifies rate limits without returning Telegram descriptions", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => response({ ok: false, error_code: 429, description: "retry after a secret", parameters: { retry_after: 12 } }, 429));
    const client = new TelegramBotClient({ botToken: "secret-token", appUrl: "https://goalguard.example", fetchImpl });
    await expect(client.getWebhookInfo()).rejects.toMatchObject({ category: "rate_limited", retryAfterSeconds: 12 });
    try {
      await client.getWebhookInfo();
    } catch (error) {
      expect(error).toBeInstanceOf(TelegramApiError);
      expect((error as Error).message).not.toContain("secret");
    }
  });

  it("validates same-origin HTTPS buttons and sends plain text", async () => {
    expect(buildTelegramReplyMarkup("https://goalguard.example", { type: "new_goal" }, "Open GoalGuard")).toEqual({ inline_keyboard: [[{ text: "Open GoalGuard", url: "https://goalguard.example/goals/new" }]] });
    expect(buildTelegramReplyMarkup("https://goalguard.example", { type: "goal", goalId: "4b3e798c-e0e8-4ab5-9e37-d4526424eb8f" }, "Review plan").inline_keyboard[0]![0]!.url).toBe("https://goalguard.example/goals/4b3e798c-e0e8-4ab5-9e37-d4526424eb8f");
    expect(() => buildTelegramReplyMarkup("http://goalguard.example", { type: "new_goal" }, "Open GoalGuard")).toThrow();

    let requestBody: Record<string, unknown> | undefined;
    const fetchImpl = vi.fn<typeof fetch>(async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return response({ ok: true, result: { message_id: 77 } });
    });
    const client = new TelegramBotClient({ botToken: "secret-token", appUrl: "https://goalguard.example", fetchImpl });
    await expect(client.sendMessage("42", "No funds moved.", buildTelegramReplyMarkup("https://goalguard.example", { type: "new_goal" }, "Open GoalGuard"))).resolves.toEqual({ message_id: "77" });
    expect(requestBody).toMatchObject({ chat_id: "42", text: "No funds moved.", reply_markup: { inline_keyboard: [[{ text: "Open GoalGuard", url: "https://goalguard.example/goals/new" }]] } });
  });
});
