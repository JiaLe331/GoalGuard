import { PrepareExecutionRequestSchema, PrepareExecutionResponseSchema } from "@/lib/contracts";
import { apiMeta, jsonSuccess, parseBody, requireIdempotencyKey, route } from "@/lib/server/http";
import { assertSameOrigin, getAnonymousOwnerSession } from "@/lib/server/session";
import { prepareExecution } from "@/lib/trades/service";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function POST(request: Request) { return route(async (requestId) => { assertSameOrigin(request); requireIdempotencyKey(request); const body = await parseBody(request, PrepareExecutionRequestSchema); const { ownerSessionHash } = await getAnonymousOwnerSession(); const data = await prepareExecution(body.tradeId, body.quoteFingerprint, body.walletAddress, ownerSessionHash); return jsonSuccess(PrepareExecutionResponseSchema, { data, meta: apiMeta(requestId) }); }); }
