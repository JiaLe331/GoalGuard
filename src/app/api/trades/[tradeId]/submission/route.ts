import { RecordSubmissionRequestSchema, RecordSubmissionResponseSchema } from "@/lib/contracts";
import { apiMeta, parseBody, requireIdempotencyKey, route } from "@/lib/server/http";
import { assertSameOrigin, getAnonymousOwnerSession } from "@/lib/server/session";
import { idempotentTradeMutation } from "@/lib/server/idempotency";
import { PostgresGoalGuardRepository } from "@/lib/db/repository";
import { recordSubmission } from "@/lib/trades/service";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
type Context = { params: Promise<{ tradeId: string }> };
export async function POST(request: Request, context: Context) { return route(async (requestId) => { assertSameOrigin(request); const idempotencyKey = requireIdempotencyKey(request); const { tradeId } = await context.params; const body = await parseBody(request, RecordSubmissionRequestSchema); const { ownerSessionHash } = await getAnonymousOwnerSession(); const repository = new PostgresGoalGuardRepository(); return idempotentTradeMutation({ key: idempotencyKey, operation: "submission", ownerSessionHash, request: { tradeId, ...body }, repository, schema: RecordSubmissionResponseSchema, execute: async () => { const trade = await recordSubmission(tradeId, body.txHash, body.walletAddress, ownerSessionHash, repository); return { body: { data: { trade }, meta: apiMeta(requestId) }, tradeId: trade.id }; } }); }); }
