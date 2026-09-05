import { GoalWorkspace } from "@/components/workflow/goal-workspace";
import { readDemoGoalSummary } from "@/lib/server/demo-goal";

export default async function GoalPage({ params }: { params: Promise<{ goalId: string }> }) {
  const { goalId } = await params;
  return <GoalWorkspace goalId={goalId} demoGoal={await readDemoGoalSummary()} />;
}
