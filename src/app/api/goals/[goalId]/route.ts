import { GetGoalResponseSchema, UpdateGoalRequestSchema, UpdateGoalResponseSchema, publicCandidate } from "@/lib/contracts";
import { readServerEnvironment } from "@/lib/config/env";
import { PostgresGoalGuardRepository } from "@/lib/db/repository";
import { ApiRouteError, apiMeta, jsonSuccess, parseBody, route } from "@/lib/server/http";
import { assertSameOrigin, getAnonymousOwnerSession } from "@/lib/server/session";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
type Context = { params: Promise<{ goalId: string }> };
/**
 * Resolves whose goal this read is scoped to.
 *
 * Normally that is the caller's own anonymous session. The single exception is the configured
 * demo goal, which resolves to its own owner so a shared link or a fresh browser can read it --
 * otherwise every visitor but the original author sees an ownership error. Reads only: PATCH and
 * every write route below stay bound to the caller's session.
 */
async function readOwnerHashFor(goalId: string, repository: PostgresGoalGuardRepository) {
  const demoGoalId = readServerEnvironment().DEMO_GOAL_ID;
  if (demoGoalId && goalId === demoGoalId) {
    const ownerSessionHash = await repository.getGoalOwnerHash(goalId);
    if (ownerSessionHash) return ownerSessionHash;
  }
  return (await getAnonymousOwnerSession()).ownerSessionHash;
}

export async function GET(_request: Request, context: Context) { return route(async (requestId) => { const { goalId } = await context.params; const repository = new PostgresGoalGuardRepository(); const ownerSessionHash = await readOwnerHashFor(goalId, repository); const goal = await repository.getGoal(goalId, ownerSessionHash); if (!goal) throw new ApiRouteError("NOT_FOUND", "Goal was not found.", 404); const [candidate, decision, trade] = await Promise.all([goal.selectedCandidateId ? repository.getCandidate(goal.selectedCandidateId, ownerSessionHash) : null, goal.councilDecisionId ? repository.getDecision(goal.councilDecisionId, ownerSessionHash) : null, goal.tradeId ? repository.getTrade(goal.tradeId, ownerSessionHash) : null]); return jsonSuccess(GetGoalResponseSchema, { data: { goal, selectedCandidate: candidate ? publicCandidate(candidate) : null, councilDecision: decision, trade }, meta: apiMeta(requestId) }); }); }
export async function PATCH(request: Request, context: Context) { return route(async (requestId) => { assertSameOrigin(request); const { goalId } = await context.params; const body = await parseBody(request, UpdateGoalRequestSchema); const { ownerSessionHash } = await getAnonymousOwnerSession(); const goal = await new PostgresGoalGuardRepository().updateGoal(goalId, ownerSessionHash, body); return jsonSuccess(UpdateGoalResponseSchema, { data: { goal }, meta: apiMeta(requestId) }); }); }
