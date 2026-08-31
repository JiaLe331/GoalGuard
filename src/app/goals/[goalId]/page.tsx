import { GoalWorkspace } from "@/components/workflow/goal-workspace";

export default async function GoalPage({ params }: { params: Promise<{ goalId: string }> }) {
  const { goalId } = await params;
  return <GoalWorkspace goalId={goalId} />;
}
