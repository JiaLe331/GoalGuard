import { loadLocalEnvironment } from "./load-local-env";
import { getTelegramSetupConfiguration } from "../src/lib/config/env";
import { TelegramBotClient } from "../src/lib/telegram/client";

loadLocalEnvironment();

const configuration = getTelegramSetupConfiguration();
if (!configuration) throw new Error("Telegram setup requires TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME, TELEGRAM_WEBHOOK_SECRET, and an HTTPS NEXT_PUBLIC_APP_URL.");

const client = new TelegramBotClient({ botToken: configuration.botToken, appUrl: configuration.appUrl });
const bot = await client.getMe();
if (!bot.username || bot.username.toLowerCase() !== configuration.botUsername.toLowerCase()) throw new Error("TELEGRAM_BOT_USERNAME does not match the BotFather account returned by getMe.");

const webhookUrl = `${configuration.appUrl.replace(/\/$/, "")}/api/integrations/telegram/webhook`;
await client.setWebhook(webhookUrl, configuration.webhookSecret, ["message"]);
await client.setMyCommands([
  { command: "start", description: "Connect GoalGuard alerts" },
  { command: "status", description: "Show the latest GoalGuard plan" },
  { command: "goals", description: "List recent GoalGuard goals" },
  { command: "alerts", description: "View or change alert settings" },
  { command: "stop", description: "Pause optional alerts" },
  { command: "unlink", description: "Disconnect Telegram alerts" },
  { command: "help", description: "Show GoalGuard bot help" },
]);

console.log(`Telegram webhook configured for @${bot.username}.`);
console.log("Allowed updates: message only.");
