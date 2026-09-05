import { describe, expect, it } from "vitest";
import { getGonkaConfiguration, getGonkaCouncilConfiguration, getTelegramSetupConfiguration, getTelegramWebConfiguration, getTelegramWorkerConfiguration, getThetanutsConfiguration, readServerEnvironment } from "./env";

const base = { GONKA_API_KEY: "key", GONKA_BASE_URL: "https://gonka.example", GONKA_STRATEGIST_MODEL: "model-a", GONKA_RISK_AUDITOR_MODEL: "model-b", GONKA_CONSUMER_ADVOCATE_MODEL: "model-a" };
const env = (value: Record<string, string> = {}): NodeJS.ProcessEnv => ({ NODE_ENV: "test", ...value });

describe("P0 environment safety", () => {
  it("uses the 168-hour expiry-gap and 15-minute snapshot defaults", () => { expect(readServerEnvironment(env())).toMatchObject({ MAX_DEADLINE_GAP_HOURS: 168, MARKET_SNAPSHOT_MS: 900_000 }); });
  it("keeps Telegram disabled with safe worker/link defaults", () => {
    expect(readServerEnvironment(env())).toMatchObject({ TELEGRAM_NOTIFICATIONS_ENABLED: "false", TELEGRAM_LINK_TTL_SECONDS: 600, TELEGRAM_REMINDER_SCAN_MS: 60_000, TELEGRAM_NOTIFICATION_BATCH_SIZE: 20 });
    expect(getTelegramWebConfiguration(env())).toBeNull();
    expect(getTelegramWorkerConfiguration(env())).toBeNull();
  });
  it("treats blank optional integration placeholders as unconfigured", () => {
    const placeholders = env({ GONKA_API_KEY: "", GONKA_BASE_URL: "  ", GONKA_STRATEGIST_MODEL: "", GONKA_RISK_AUDITOR_MODEL: "", GONKA_CONSUMER_ADVOCATE_MODEL: "", THETANUTS_RPC_URL: "", THETANUTS_RPC_FALLBACK_URL: "", THETANUTS_REFERRER_ADDRESS: "" });
    expect(readServerEnvironment(placeholders)).toMatchObject({ GONKA_API_KEY: undefined, GONKA_BASE_URL: undefined, THETANUTS_RPC_URL: undefined, THETANUTS_RPC_FALLBACK_URL: undefined, THETANUTS_REFERRER_ADDRESS: undefined });
    expect(getGonkaConfiguration(placeholders)).toBeNull();
    expect(getGonkaCouncilConfiguration(placeholders)).toBeNull();
    expect(getThetanutsConfiguration(placeholders)).toBeNull();
  });
  it("requires at least two distinct council models", () => { expect(getGonkaCouncilConfiguration(env(base))?.models.risk_auditor).toBe("model-b"); expect(getGonkaCouncilConfiguration(env({ ...base, GONKA_RISK_AUDITOR_MODEL: "model-a" }))).toBeNull(); });
  it("rejects the former SQLite URL at the environment boundary", () => { expect(() => readServerEnvironment(env({ DATABASE_URL: "file:./data/goalguard.db" }))).toThrow(); });
  it("requires validated primary and fallback Base RPC URLs", () => {
    expect(getThetanutsConfiguration(env({ THETANUTS_RPC_URL: "https://alchemy.example/key", THETANUTS_RPC_FALLBACK_URL: "https://infura.example/key" }))).toMatchObject({ chainId: 8453, fallbackRpcUrl: "https://infura.example/key" });
    expect(getThetanutsConfiguration(env({ THETANUTS_RPC_URL: "https://alchemy.example/key" }))).toBeNull();
    expect(() => readServerEnvironment(env({ THETANUTS_RPC_URL: "https://alchemy.example/key", THETANUTS_RPC_FALLBACK_URL: "not-a-url" }))).toThrow();
  });
  it("treats blank optional environment placeholders as absent", () => {
    expect(getThetanutsConfiguration(env({ GONKA_API_KEY: "", GONKA_BASE_URL: "", THETANUTS_RPC_URL: "https://alchemy.example/key", THETANUTS_RPC_FALLBACK_URL: "https://infura.example/key", THETANUTS_REFERRER_ADDRESS: "" }))).toMatchObject({ chainId: 8453 });
  });
  it("validates BotFather usernames and webhook secrets", () => {
    expect(() => readServerEnvironment(env({ TELEGRAM_BOT_USERNAME: "not-a-bot" }))).toThrow();
    expect(() => readServerEnvironment(env({ TELEGRAM_BOT_USERNAME: "goalguardbot", TELEGRAM_WEBHOOK_SECRET: "contains space" }))).toThrow();
    expect(readServerEnvironment(env({ TELEGRAM_BOT_USERNAME: "goalguardbot", TELEGRAM_WEBHOOK_SECRET: "secret-token_123" }))).toMatchObject({ TELEGRAM_BOT_USERNAME: "goalguardbot" });
  });
  it("only exposes complete HTTPS Telegram configurations", () => {
    const configured = env({ TELEGRAM_NOTIFICATIONS_ENABLED: "true", TELEGRAM_BOT_TOKEN: "bot-token", TELEGRAM_BOT_USERNAME: "goalguardbot", TELEGRAM_WEBHOOK_SECRET: "secret-token_123", NEXT_PUBLIC_APP_URL: "https://goalguard.example", DATABASE_URL: "postgresql://postgres:password@example.test/db" });
    expect(getTelegramWebConfiguration(configured)).toMatchObject({ botUsername: "goalguardbot", appUrl: "https://goalguard.example", linkTtlSeconds: 600 });
    expect(getTelegramWorkerConfiguration(configured)).toMatchObject({ botUsername: "goalguardbot", appUrl: "https://goalguard.example", notificationBatchSize: 20 });
    expect(getTelegramSetupConfiguration(configured)).toMatchObject({ botUsername: "goalguardbot", webhookSecret: "secret-token_123" });
    expect(getTelegramWebConfiguration({ ...configured, NEXT_PUBLIC_APP_URL: "http://localhost:3000" })).toBeNull();
  });
});
