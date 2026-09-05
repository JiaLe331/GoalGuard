import "server-only";

import { z } from "zod";

import { TelegramIdentifierSchema, type TelegramGoalButtonTarget } from "./contracts";

const TelegramApiEnvelopeSchema = z.object({
  ok: z.boolean(),
  result: z.unknown().optional(),
  error_code: z.number().int().nullable().optional(),
  description: z.string().optional(),
  parameters: z.object({ retry_after: z.number().int().positive().max(86_400).optional() }).passthrough().optional(),
}).passthrough();

const TelegramUserResultSchema = z.object({
  id: z.union([z.number().int().nonnegative().safe(), z.string().regex(/^\d{1,32}$/)]).transform(String),
  is_bot: z.literal(true),
  username: z.string().trim().min(1).optional(),
}).passthrough();

const TelegramWebhookInfoSchema = z.object({
  // Telegram returns an empty URL when no webhook is configured.
  url: z.union([z.string().url(), z.literal("")]),
  has_custom_certificate: z.boolean(),
  pending_update_count: z.number().int().nonnegative(),
  ip_address: z.string().optional(),
  last_error_date: z.number().int().nonnegative().optional(),
  last_error_message: z.string().optional(),
  max_connections: z.number().int().min(1).max(100).optional(),
  allowed_updates: z.array(z.string()).optional(),
}).passthrough();

const TelegramSentMessageSchema = z.object({
  message_id: z.union([z.number().int().nonnegative().safe(), z.string().regex(/^\d{1,32}$/)]).transform(String),
}).passthrough();

const TelegramBooleanSchema = z.boolean();

export type TelegramWebhookInfo = z.infer<typeof TelegramWebhookInfoSchema>;
export type TelegramSentMessage = z.infer<typeof TelegramSentMessageSchema>;

export type TelegramApiErrorCategory = "rate_limited" | "blocked" | "client" | "server" | "network" | "timeout" | "invalid_response";

export class TelegramApiError extends Error {
  constructor(
    readonly category: TelegramApiErrorCategory,
    readonly status: number | null = null,
    readonly retryAfterSeconds: number | null = null,
    readonly telegramErrorCode: number | null = null,
  ) {
    super(`Telegram Bot API request failed (${category}).`);
    this.name = "TelegramApiError";
  }
}

export interface TelegramClientOptions {
  botToken: string;
  appUrl: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

function httpsUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Telegram client URLs must use HTTPS.");
  return url;
}

export function buildTelegramReplyMarkup(appUrl: string, target: TelegramGoalButtonTarget, label: string) {
  const configuredOrigin = httpsUrl(appUrl).origin;
  const path = target.type === "new_goal" ? "/goals/new" : `/goals/${target.goalId}`;
  const url = new URL(path, `${configuredOrigin}/`);
  if (url.protocol !== "https:" || url.origin !== configuredOrigin) throw new Error("Telegram button URL escaped the configured GoalGuard origin.");
  return { inline_keyboard: [[{ text: label, url: url.toString() }]] };
}

function chatId(value: string) {
  return TelegramIdentifierSchema.parse(value);
}

export class TelegramBotClient {
  private readonly endpoint: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  readonly appUrl: string;

  constructor(options: TelegramClientOptions) {
    if (!options.botToken.trim()) throw new Error("Telegram bot token is required.");
    this.endpoint = `https://api.telegram.org/bot${options.botToken}`;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.appUrl = httpsUrl(options.appUrl).toString();
  }

  private async call<T>(method: string, payload: Record<string, unknown>, schema: z.ZodType<T>): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.endpoint}/${method}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === "AbortError") throw new TelegramApiError("timeout");
      throw new TelegramApiError("network");
    }
    clearTimeout(timeout);

    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      throw new TelegramApiError("invalid_response", response.status);
    }
    const envelope = TelegramApiEnvelopeSchema.safeParse(raw);
    if (!envelope.success) throw new TelegramApiError("invalid_response", response.status);
    if (!response.ok || !envelope.data.ok) {
      const status = response.status || envelope.data.error_code || null;
      const telegramErrorCode = envelope.data.error_code ?? null;
      const retryAfterSeconds = envelope.data.parameters?.retry_after ?? null;
      const category: TelegramApiErrorCategory = status === 429 || telegramErrorCode === 429 ? "rate_limited" : status === 403 || telegramErrorCode === 403 ? "blocked" : status !== null && status >= 500 ? "server" : "client";
      throw new TelegramApiError(category, status, retryAfterSeconds, telegramErrorCode);
    }
    const result = schema.safeParse(envelope.data.result);
    if (!result.success) throw new TelegramApiError("invalid_response", response.status);
    return result.data;
  }

  async getMe() {
    const result = await this.call("getMe", {}, TelegramUserResultSchema);
    return { id: result.id, username: result.username ?? null };
  }

  async getWebhookInfo() {
    return this.call("getWebhookInfo", {}, TelegramWebhookInfoSchema);
  }

  async setWebhook(url: string, secretToken: string, allowedUpdates: string[] = ["message"]) {
    const webhookUrl = httpsUrl(url).toString();
    if (!secretToken || !/^[A-Za-z0-9_-]{1,256}$/.test(secretToken)) throw new Error("Telegram webhook secret is invalid.");
    if (allowedUpdates.length !== 1 || allowedUpdates[0] !== "message") throw new Error("GoalGuard only provisions message webhook updates.");
    return this.call("setWebhook", { url: webhookUrl, secret_token: secretToken, allowed_updates: allowedUpdates }, TelegramBooleanSchema);
  }

  async setMyCommands(commands: Array<{ command: string; description: string }>) {
    return this.call("setMyCommands", { commands }, TelegramBooleanSchema);
  }

  async sendMessage(chat: string, text: string, replyMarkup?: { inline_keyboard: Array<Array<{ text: string; url: string }>> }) {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 4096) throw new Error("Telegram message length is outside the Bot API limit.");
    return this.call("sendMessage", { chat_id: chatId(chat), text: trimmed, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) }, TelegramSentMessageSchema);
  }
}
