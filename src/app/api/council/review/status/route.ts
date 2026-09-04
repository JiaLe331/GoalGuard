import { GetCouncilReviewStatusRequestSchema, GetCouncilReviewStatusResponseSchema, type CouncilRoleProgress } from "@/lib/contracts";
import { CouncilOutputSchema, councilRoles, purposeForRole } from "@/lib/council/service";
import { PostgresGoalGuardRepository } from "@/lib/db/repository";
import { ApiRouteError, apiMeta, jsonSuccess, route } from "@/lib/server/http";
import { getAnonymousOwnerSession } from "@/lib/server/session";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";

// gonka_inferences timestamp columns come back from drizzle as Postgres's own text
// representation, not strict ISO 8601 -- same conversion db-mappers.ts's private `iso()` does
// for every other entity mapper.
const iso = (value: string) => new Date(value).toISOString();

// Read-only, polled view of a council review that may still be in flight. reviewCandidate()
// (src/lib/council/service.ts) writes each role's gonka_inferences row the instant that role
// finishes, well before the overall request resolves -- this endpoint surfaces those real,
// already-committed rows so the frontend can show live per-role progress instead of one opaque
// spinner for the whole 3-role sequence. It never invents a percentage or a status backed by
// nothing: "running" only appears for the one role whose turn it is in the fixed, known
// strategist -> risk_auditor -> consumer_advocate order, inferred from which purposes already
// have a row for the current attempt.
//
// Known limitation: if this is polled for a *retried* attempt (forceNewAttempt) before that
// retry's first role has completed, the previous attempt's rows are still the newest on record
// and will briefly display as "succeeded"/"failed" until the retry's own first row supersedes
// them. This self-corrects within one role's real latency and never affects the authoritative
// decision returned by POST /api/council/review, so it was left as-is rather than adding a
// schema migration to track attempts explicitly.
export async function GET(request: Request) {
  return route(async (requestId) => {
    const url = new URL(request.url);
    const { goalId, candidateId } = GetCouncilReviewStatusRequestSchema.parse({
      goalId: url.searchParams.get("goalId"),
      candidateId: url.searchParams.get("candidateId"),
    });
    const { ownerSessionHash } = await getAnonymousOwnerSession();
    const repository = new PostgresGoalGuardRepository();
    const [goal, candidate] = await Promise.all([
      repository.getGoal(goalId, ownerSessionHash),
      repository.getCandidate(candidateId, ownerSessionHash),
    ]);
    if (!goal || !candidate || candidate.goalId !== goal.id) throw new ApiRouteError("NOT_FOUND", "Goal and candidate were not found.", 404);

    const rows = await repository.getCurrentCouncilAttemptInferences(goalId, candidateId, ownerSessionHash);
    const byPurpose = new Map(rows.map((row) => [row.purpose, row]));

    let priorCompletedAt: string | null = null;
    let runningAssigned = false;
    const roles: CouncilRoleProgress[] = councilRoles.map((role) => {
      const row = byPurpose.get(purposeForRole[role]);
      if (!row) {
        const status = runningAssigned ? "waiting" : "running";
        runningAssigned = true;
        return { role, status, model: null, requestId: null, startedAt: status === "running" ? priorCompletedAt : null, completedAt: null, latencyMs: null, verdict: null, summary: null, concerns: [], errorMessage: null };
      }
      priorCompletedAt = row.completedAt ? iso(row.completedAt) : null;
      if (row.status === "failed") {
        return { role, status: "failed", model: row.model, requestId: row.requestId, startedAt: null, completedAt: row.completedAt ? iso(row.completedAt) : null, latencyMs: row.latencyMs, verdict: null, summary: null, concerns: [], errorMessage: row.errorMessage };
      }
      const decoded = CouncilOutputSchema.safeParse(row.rawResponseJson);
      return {
        role,
        status: "succeeded",
        model: row.model,
        requestId: row.requestId,
        startedAt: null,
        completedAt: row.completedAt ? iso(row.completedAt) : null,
        latencyMs: row.latencyMs,
        verdict: decoded.success ? decoded.data.verdict : null,
        summary: decoded.success ? decoded.data.summary : null,
        concerns: decoded.success ? decoded.data.concerns : [],
        errorMessage: null,
      };
    });

    return jsonSuccess(GetCouncilReviewStatusResponseSchema, { data: { roles }, meta: apiMeta(requestId) });
  });
}
