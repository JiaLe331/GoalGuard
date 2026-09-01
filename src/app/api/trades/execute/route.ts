import { PrepareExecutionRequestSchema, PrepareExecutionResponseSchema } from "@/lib/contracts";
import { apiMeta, parseBody, requireIdempotencyKey, route } from "@/lib/server/http";
import { assertSameOrigin, getAnonymousOwnerSession } from "@/lib/server/session";
import { idempotentTradeMutation } from "@/lib/server/idempotency";
import { PostgresGoalGuardRepository } from "@/lib/db/repository";
import { prepareExecution } from "@/lib/trades/service";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function POST(request: Request) { return route(async (requestId) => { assertSameOrigin(request); const idempotencyKey = requireIdempotencyKey(request); const body = await parseBody(request, PrepareExecutionRequestSchema); const { ownerSessionHash } = await getAnonymousOwnerSession(); const repository = new PostgresGoalGuardRepository(); return idempotentTradeMutation({ key: idempotencyKey, operation: "execute", ownerSessionHash, request: body, repository, schema: PrepareExecutionResponseSchema, execute: async () => { const data = await prepareExecution(body.tradeId, body.quoteFingerprint, body.walletAddress, ownerSessionHash, repository); return { body: { data, meta: apiMeta(requestId) }, tradeId: data.trade.id }; } }); }); }
