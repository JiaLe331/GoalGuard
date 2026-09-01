import { PreviewTradeRequestSchema, PreviewTradeResponseSchema } from "@/lib/contracts";
import { apiMeta, parseBody, requireIdempotencyKey, route } from "@/lib/server/http";
import { assertSameOrigin, getAnonymousOwnerSession } from "@/lib/server/session";
import { idempotentTradeMutation } from "@/lib/server/idempotency";
import { PostgresGoalGuardRepository } from "@/lib/db/repository";
import { previewTrade } from "@/lib/trades/service";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return route(async (requestId) => {
    assertSameOrigin(request);
    const idempotencyKey = requireIdempotencyKey(request);
    const body = await parseBody(request, PreviewTradeRequestSchema);
    const { ownerSessionHash } = await getAnonymousOwnerSession();
    const repository = new PostgresGoalGuardRepository();
    return idempotentTradeMutation({ key: idempotencyKey, operation: "preview", ownerSessionHash, request: body, repository, schema: PreviewTradeResponseSchema, execute: async () => {
      const data = await previewTrade(body.goalId, body.candidateId, body.councilDecisionId, body.walletAddress, idempotencyKey, ownerSessionHash, repository);
      return { body: { data, meta: apiMeta(requestId) }, tradeId: data.trade.id, status: 201 };
    } });
  });
}
