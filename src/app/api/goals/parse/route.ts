import { ParseGoalRequestSchema, ParseGoalResponseSchema } from "@/lib/contracts";
import { parseGoal } from "@/lib/goals/service";
import { apiMeta, jsonSuccess, parseBody, route } from "@/lib/server/http";
import { assertSameOrigin, getAnonymousOwnerSession } from "@/lib/server/session";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function POST(request: Request) { return route(async (requestId) => { assertSameOrigin(request); const body = await parseBody(request, ParseGoalRequestSchema); const { ownerSessionHash } = await getAnonymousOwnerSession(); const data = await parseGoal(body, ownerSessionHash); return jsonSuccess(ParseGoalResponseSchema, { data, meta: apiMeta(requestId) }, data.goal ? 201 : 200); }); }
