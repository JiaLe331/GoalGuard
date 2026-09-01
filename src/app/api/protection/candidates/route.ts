import { GenerateCandidatesRequestSchema, GenerateCandidatesResponseSchema, publicCandidate } from "@/lib/contracts";
import { PostgresGoalGuardRepository } from "@/lib/db/repository";
import { ApiRouteError, apiMeta, jsonSuccess, parseBody, route } from "@/lib/server/http";
import { assertSameOrigin, getAnonymousOwnerSession } from "@/lib/server/session";
import { generateProtectionCandidates } from "@/lib/thetanuts/strategy";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return route(async (requestId) => {
    assertSameOrigin(request);
    const body = await parseBody(request, GenerateCandidatesRequestSchema);
    const { ownerSessionHash } = await getAnonymousOwnerSession();
    const repository = new PostgresGoalGuardRepository();
    const goal = await repository.getGoal(body.goalId, ownerSessionHash);
    if (!goal) throw new ApiRouteError("NOT_FOUND", "Goal was not found.", 404);
    await repository.updateGoalStatus(goal.id, ownerSessionHash, "searching");
    try {
      const result = await generateProtectionCandidates(goal);
      if (!result.candidates.length) throw new ApiRouteError("NO_SUITABLE_CANDIDATE", "No live ETH put satisfies the goal's expiry, cost, coverage, liquidity, and fillability constraints.", 422, true, result.rejected.slice(0, 10));
      await repository.replaceCandidates(goal.id, ownerSessionHash, result.candidates);
      const updated = await repository.getGoal(goal.id, ownerSessionHash);
      return jsonSuccess(GenerateCandidatesResponseSchema, { data: { goal: updated!, candidates: result.candidates.map(publicCandidate), selectedCandidateId: result.candidates[0]!.id, rejected: result.rejected, marketAsOf: result.marketAsOf }, meta: apiMeta(requestId) });
    } catch (error) {
      try { await repository.updateGoalStatus(goal.id, ownerSessionHash, "failed"); } catch { /* Preserve the original integration error if state changed concurrently. */ }
      throw error;
    }
  });
}
