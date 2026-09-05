import { DeleteTelegramConnectionResponseSchema, GetTelegramConnectionResponseSchema } from "@/lib/contracts";
import { PostgresGoalGuardRepository } from "@/lib/db/repository";
import { getTelegramWebConfiguration } from "@/lib/config/env";
import { apiMeta, jsonSuccess, route } from "@/lib/server/http";
import { assertSameOrigin, getAnonymousOwnerSession } from "@/lib/server/session";
import { getTelegramPublicConnectionStatus, telegramConnectionResponse } from "@/lib/telegram/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return route(async (requestId) => {
    const configuration = getTelegramWebConfiguration();
    if (!configuration) return jsonSuccess(GetTelegramConnectionResponseSchema, telegramConnectionResponse({ status: "unavailable" }, apiMeta(requestId)));
    const { ownerSessionHash } = await getAnonymousOwnerSession();
    const status = await getTelegramPublicConnectionStatus(new PostgresGoalGuardRepository(), ownerSessionHash);
    return jsonSuccess(GetTelegramConnectionResponseSchema, telegramConnectionResponse(status, apiMeta(requestId)));
  });
}

export async function DELETE(request: Request) {
  return route(async (requestId) => {
    assertSameOrigin(request);
    const { ownerSessionHash } = await getAnonymousOwnerSession();
    await new PostgresGoalGuardRepository().revokeTelegramConnectionForOwner(ownerSessionHash, new Date().toISOString());
    return jsonSuccess(DeleteTelegramConnectionResponseSchema, telegramConnectionResponse({ status: "disconnected" }, apiMeta(requestId)));
  });
}
