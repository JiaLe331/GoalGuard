import { GetTradeResponseSchema } from "@/lib/contracts";
import { PostgresGoalGuardRepository } from "@/lib/db/repository";
import { ApiRouteError, apiMeta, jsonSuccess, route } from "@/lib/server/http";
import { getAnonymousOwnerSession } from "@/lib/server/session";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
type Context = { params: Promise<{ tradeId: string }> };
export async function GET(_request: Request, context: Context) { return route(async (requestId) => { const { tradeId } = await context.params; const { ownerSessionHash } = await getAnonymousOwnerSession(); const repository = new PostgresGoalGuardRepository(); const verification = await repository.getTradeVerification(tradeId, ownerSessionHash); if (!verification) throw new ApiRouteError("NOT_FOUND", "Trade was not found.", 404); const receipt = verification.receiptBlockNumber ? { blockNumber: verification.receiptBlockNumber, success: verification.trade.status === "confirmed", confirmations: verification.receiptConfirmations ?? 0, explorerUrl: `https://basescan.org/tx/${verification.trade.txHash}` } : null; return jsonSuccess(GetTradeResponseSchema, { data: { trade: verification.trade, receipt }, meta: apiMeta(requestId) }); }); }
