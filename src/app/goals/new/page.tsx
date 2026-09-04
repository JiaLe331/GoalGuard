import { GoalComposer } from "@/components/goals/goal-composer";
import { FloatingEditorialNavbar } from "@/components/navigation/floating-editorial-navbar";
import { StageShell } from "@/components/workflow/workflow-primitives";

export default function NewGoalPage() {
  return (
    <>
      <a href="#new-goal-content" className="skip-link">Skip to goal creation</a>
      <FloatingEditorialNavbar variant="workflow" contextLabel="Define goal · What are you protecting?" />

      <main id="new-goal-content" tabIndex={-1} className="min-h-screen bg-[var(--background)] pb-12 outline-none">
        <StageShell step={1} eyebrow="Define goal" title="What are you protecting?">
          <div className="mx-auto max-w-3xl rounded-[1.5rem] bg-[var(--surface-raised)] p-5 text-[color:var(--foreground)] shadow-[var(--shadow-float-strong)] sm:rounded-[1.75rem] sm:p-7">
            <GoalComposer />
          </div>
        </StageShell>
      </main>
    </>
  );
}
