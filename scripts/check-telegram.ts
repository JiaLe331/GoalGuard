import { loadLocalEnvironment } from "./load-local-env";
import { getTelegramSetupConfiguration } from "../src/lib/config/env";
import { TelegramBotClient } from "../src/lib/telegram/client";

loadLocalEnvironment();

const configuration = getTelegramSetupConfiguration();
if (!configuration) throw new Error("Telegram check requires TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME, TELEGRAM_WEBHOOK_SECRET, and an HTTPS NEXT_PUBLIC_APP_URL.");

const client = new TelegramBotClient({ botToken: configuration.botToken, appUrl: configuration.appUrl });
const bot = await client.getMe();
const webhook = await client.getWebhookInfo();
const expectedUrl = `${configuration.appUrl.replace(/\/$/, "")}/api/integrations/telegram/webhook`;
const botMatches = Boolean(bot.username && bot.username.toLowerCase() === configuration.botUsername.toLowerCase());
const urlMatches = webhook.url === expectedUrl;
const updatesMatch = (webhook.allowed_updates ?? []).length === 1 && webhook.allowed_updates?.[0] === "message";

console.log(`Bot: ${botMatches ? "matched " : "mismatch — "}@${bot.username ?? "unknown"}`);
console.log(`Webhook URL: ${urlMatches ? "configured" : webhook.url ? "different" : "not configured"}`);
console.log(`Allowed updates: ${updatesMatch ? "message only" : "review required"}`);
console.log(`Pending updates: ${webhook.pending_update_count}`);
if (!botMatches || !urlMatches || !updatesMatch) process.exitCode = 1;
