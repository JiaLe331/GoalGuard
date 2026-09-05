import { getTelegramWebConfiguration } from "@/lib/config/env";
import { PostgresGoalGuardRepository } from "@/lib/db/repository";
import { TelegramUpdateSchema } from "@/lib/telegram/contracts";
import { processTelegramUpdate } from "@/lib/telegram/service";
import { isTelegramWebhookSecretValid } from "@/lib/telegram/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_WEBHOOK_BODY_BYTES = 64 * 1024;
const noStoreHeaders = { "Cache-Control": "no-store" };

function emptyResponse(status: number) {
  return new Response(null, { status, headers: noStoreHeaders });
}

export async function POST(request: Request) {
  let configuration: ReturnType<typeof getTelegramWebConfiguration>;
  try {
    configuration = getTelegramWebConfiguration();
  } catch {
    return emptyResponse(503);
  }
  if (!configuration) return emptyResponse(503);
  if (!isTelegramWebhookSecretValid(configuration.webhookSecret, request.headers.get("x-telegram-bot-api-secret-token"))) return emptyResponse(401);

  const declaredLength = request.headers.get("content-length");
  if (declaredLength && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > MAX_WEBHOOK_BODY_BYTES)) return emptyResponse(413);

  let body: string;
  try {
    body = await request.text();
  } catch {
    return emptyResponse(400);
  }
  if (new TextEncoder().encode(body).byteLength > MAX_WEBHOOK_BODY_BYTES) return emptyResponse(413);

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(body);
  } catch {
    return emptyResponse(400);
  }
  const update = TelegramUpdateSchema.safeParse(parsedBody);
  if (!update.success) return emptyResponse(400);

  try {
    await processTelegramUpdate(update.data, configuration.botUsername, new PostgresGoalGuardRepository());
    return emptyResponse(200);
  } catch {
    // Do not return GoalGuard's normal JSON error envelope to Telegram, and do not
    // log the update because it could contain a one-time link token.
    console.error("Telegram webhook processing failed");
    return emptyResponse(500);
  }
}
