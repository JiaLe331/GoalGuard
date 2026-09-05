import { CreateTelegramLinkRequestSchema, CreateTelegramLinkResponseSchema } from "@/lib/contracts";
import { getTelegramWebConfiguration } from "@/lib/config/env";
import { PostgresGoalGuardRepository } from "@/lib/db/repository";
import { ApiRouteError, apiMeta, jsonSuccess, parseBody, route } from "@/lib/server/http";
import { assertSameOrigin, getAnonymousOwnerSession } from "@/lib/server/session";
import { createTelegramLink } from "@/lib/telegram/linking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return route(async (requestId) => {
    assertSameOrigin(request);
    const configuration = getTelegramWebConfiguration();
    if (!configuration) throw new ApiRouteError("TELEGRAM_UNAVAILABLE", "Telegram alerts are not available.", 503, true);
    const body = await parseBody(request, CreateTelegramLinkRequestSchema);
    const { ownerSessionHash } = await getAnonymousOwnerSession();
    const repository = new PostgresGoalGuardRepository();
    const existing = await repository.getTelegramConnectionForOwner(ownerSessionHash);
    if (existing?.status === "connected") throw new ApiRouteError("CONFLICT", "Disconnect the current Telegram account before linking another one.", 409);
    const link = await createTelegramLink({ ownerSessionHash, timezone: body.timezone, repository, configuration });
    const response = jsonSuccess(CreateTelegramLinkResponseSchema, { data: link, meta: apiMeta(requestId) }, 201);
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  });
}
