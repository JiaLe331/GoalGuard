export function ProgressSteps({ active }: { active: "goal" | "market" | "review" }) {
  const items = [
    ["goal", "Reading your goal"],
    ["market", "Checking live protection options"],
    ["review", "GoalGuard reviewing"],
  ] as const;
  const activeIndex = items.findIndex(([key]) => key === active);
  return (
    <ol className="space-y-3" aria-label="Protection plan progress" aria-live="polite">
      {items.map(([key, label], index) => (
        <li key={key} className={`flex items-center gap-3 text-sm ${index === activeIndex ? "text-white" : index < activeIndex ? "text-[#a9d58a]" : "text-[#65746b]"}`}>
          <span className={`grid size-7 place-items-center rounded-full border text-xs ${index === activeIndex ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : "border-white/10"}`} aria-hidden="true">
            {index < activeIndex ? "✓" : index + 1}
          </span>
          {label}{index === activeIndex ? <span className="sr-only">, in progress</span> : null}
        </li>
      ))}
    </ol>
  );
}
