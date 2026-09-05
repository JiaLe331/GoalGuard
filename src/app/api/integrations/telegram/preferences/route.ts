import { UpdateTelegramPreferencesRequestSchema, UpdateTelegramPreferencesResponseSchema } from "@/lib/contracts";
import { getTelegramWebConfiguration } from "@/lib/config/env";
import { PostgresGoalGuardRepository } from "@/lib/db/repository";
import { ApiRouteError, apiMeta, jsonSuccess, parseBody, route } from "@/lib/server/http";
import { assertSameOrigin, getAnonymousOwnerSession } from "@/lib/server/session";
import { getTelegramPublicConnectionStatus, telegramConnectionResponse } from "@/lib/telegram/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  return route(async (requestId) => {
    assertSameOrigin(request);
    if (!getTelegramWebConfiguration()) throw new ApiRouteError("TELEGRAM_UNAVAILABLE", "Telegram alerts are not available.", 503, true);
    const body = await parseBody(request, UpdateTelegramPreferencesRequestSchema);
    const { ownerSessionHash } = await getAnonymousOwnerSession();
    const repository = new PostgresGoalGuardRepository();
    const connection = await repository.getTelegramConnectionForOwner(ownerSessionHash);
    if (!connection) throw new ApiRouteError("NOT_FOUND", "Telegram alerts are not connected.", 404);
    if (connection.status === "blocked") throw new ApiRouteError("CONFLICT", "Telegram has blocked this bot. Reconnect Telegram before changing alerts.", 409);
    await repository.updateTelegramPreferences(connection.id, body);
    const status = await getTelegramPublicConnectionStatus(repository, ownerSessionHash);
    return jsonSuccess(UpdateTelegramPreferencesResponseSchema, telegramConnectionResponse(status, apiMeta(requestId)));
  });
}
