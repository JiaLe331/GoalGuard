export type StatusTone = "ready" | "info" | "warning" | "error" | "neutral";

const toneClasses: Record<StatusTone, string> = {
  ready: "border-[var(--positive-surface)] bg-[var(--positive-surface)] text-[color:var(--positive)] [&>span]:bg-[var(--positive)]",
  info: "border-[var(--accent-soft)] bg-[var(--accent-soft)] text-[color:var(--foreground)] [&>span]:bg-[var(--foreground)]",
  warning: "border-[var(--warning-surface)] bg-[var(--warning-surface)] text-[color:var(--warning)] [&>span]:bg-[var(--warning)]",
  error: "border-[var(--negative-surface)] bg-[var(--negative-surface)] text-[color:var(--negative)] [&>span]:bg-[var(--negative)]",
  neutral: "border-[var(--surface-muted)] bg-[var(--surface-muted)] text-[color:var(--foreground-soft)] [&>span]:bg-[var(--foreground-muted)]",
};

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: StatusTone }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${toneClasses[tone]}`}>
      <span className="size-1.5 rounded-full" aria-hidden="true" />
      {label}
    </span>
  );
}
