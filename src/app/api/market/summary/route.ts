import { MarketSummaryResponseSchema } from "@/lib/contracts";
import { PostgresGoalGuardRepository } from "@/lib/db/repository";
import { apiMeta, jsonSuccess, route } from "@/lib/server/http";
import { getLatestMarketSnapshot } from "@/lib/market/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return route(async (requestId) => {
    const snapshot = await getLatestMarketSnapshot(new PostgresGoalGuardRepository());
    return jsonSuccess(MarketSummaryResponseSchema, { data: { snapshot }, meta: apiMeta(requestId) });
  });
}
