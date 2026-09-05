import { MarketSummaryResponseSchema } from "@/lib/contracts";
import { PostgresGoalGuardRepository } from "@/lib/db/repository";
import { apiMeta, jsonSuccess, route } from "@/lib/server/http";
import { getMarketSeries } from "@/lib/market/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return route(async (requestId) => {
    // One read serves both the headline and the trend: the newest entry of the series is the
    // snapshot, so asking for the latest separately would be a redundant round trip.
    const series = await getMarketSeries(new PostgresGoalGuardRepository());
    const snapshot = series.at(-1) ?? null;
    return jsonSuccess(MarketSummaryResponseSchema, { data: { snapshot, series }, meta: apiMeta(requestId) });
  });
}
