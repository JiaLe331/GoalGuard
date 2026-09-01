import { PreviewTradeRequestSchema, PreviewTradeResponseSchema } from "@/lib/contracts";
import { apiMeta, jsonSuccess, parseBody, route } from "@/lib/server/http";
import { assertSameOrigin, getAnonymousOwnerSession } from "@/lib/server/session";
import { previewTrade } from "@/lib/trades/service";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function POST(request: Request) { return route(async (requestId) => { assertSameOrigin(request); const body = await parseBody(request, PreviewTradeRequestSchema); const { ownerSessionHash } = await getAnonymousOwnerSession(); const data = await previewTrade(body.goalId, body.candidateId, body.councilDecisionId, body.walletAddress, ownerSessionHash); return jsonSuccess(PreviewTradeResponseSchema, { data, meta: apiMeta(requestId) }, 201); }); }
