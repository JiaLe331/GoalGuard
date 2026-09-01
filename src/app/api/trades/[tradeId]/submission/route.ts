import { RecordSubmissionRequestSchema, RecordSubmissionResponseSchema } from "@/lib/contracts";
import { apiMeta, jsonSuccess, parseBody, requireIdempotencyKey, route } from "@/lib/server/http";
import { assertSameOrigin, getAnonymousOwnerSession } from "@/lib/server/session";
import { recordSubmission } from "@/lib/trades/service";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
type Context = { params: Promise<{ tradeId: string }> };
export async function POST(request: Request, context: Context) { return route(async (requestId) => { assertSameOrigin(request); requireIdempotencyKey(request); const { tradeId } = await context.params; const body = await parseBody(request, RecordSubmissionRequestSchema); const { ownerSessionHash } = await getAnonymousOwnerSession(); const trade = await recordSubmission(tradeId, body.txHash, body.walletAddress, ownerSessionHash); return jsonSuccess(RecordSubmissionResponseSchema, { data: { trade }, meta: apiMeta(requestId) }); }); }
