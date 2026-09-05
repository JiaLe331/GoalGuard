import { GoalWorkspace } from "@/components/workflow/goal-workspace";
import { readDemoGoalSummary } from "@/lib/server/demo-goal";

// Reads the live demo goal, so this must not be baked in at build time.
export const dynamic = "force-dynamic";

// The persistent workspace, entered from the landing page. It stands up with no goal attached:
// the live protection market, the goal rail and the council rail are all meaningful before
// anything is created, so arriving here never means starting a form.
export default async function DashboardPage() {
  return <GoalWorkspace demoGoal={await readDemoGoalSummary()} />;
}
