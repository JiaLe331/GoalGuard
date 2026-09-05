import "server-only";

import { readServerEnvironment } from "@/lib/config/env";
import { PostgresGoalGuardRepository } from "@/lib/db/repository";
import type { DemoGoalSummary } from "@/components/dashboard/goal-rail";

/**
 * The read-only goal every visitor may open, resolved server-side so the workspace rail is never
 * empty on a machine that has never created one. Returns null when unconfigured or missing --
 * an absent demo goal simply means the rail shows only this browser's own history.
 */
export async function readDemoGoalSummary(): Promise<DemoGoalSummary | null> {
  const demoGoalId = readServerEnvironment().DEMO_GOAL_ID;
  if (!demoGoalId) return null;
  try {
    const repository = new PostgresGoalGuardRepository();
    const ownerSessionHash = await repository.getGoalOwnerHash(demoGoalId);
    if (!ownerSessionHash) return null;
    const goal = await repository.getGoal(demoGoalId, ownerSessionHash);
    if (!goal) return null;
    return {
      id: goal.id,
      goalType: goal.goalType,
      customGoalLabel: goal.customGoalLabel,
      protectedValueUsd: goal.protectedValueUsd,
      status: goal.status,
    };
  } catch {
    // The workspace is still fully usable without the demo goal, so a database hiccup here must
    // not take the whole page down with it.
    return null;
  }
}
