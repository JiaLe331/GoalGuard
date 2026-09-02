export type StatusTone = "ready" | "info" | "warning" | "error" | "neutral";

const toneClasses: Record<StatusTone, string> = {
  ready: "border-[color-mix(in_srgb,var(--positive)_40%,var(--border))] bg-[var(--surface)] text-[var(--foreground-soft)] [&>span]:bg-[var(--positive)]",
  info: "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-soft)] [&>span]:bg-[var(--foreground)]",
  warning: "border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] bg-[var(--surface)] text-[var(--foreground-soft)] [&>span]:bg-[var(--accent)]",
  error: "border-[color-mix(in_srgb,var(--negative)_45%,var(--border))] bg-[var(--surface)] text-[var(--foreground-soft)] [&>span]:bg-[var(--negative)]",
  neutral: "border-[var(--border)] bg-transparent text-[var(--foreground-soft)] [&>span]:bg-[var(--muted)]",
};

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: StatusTone }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${toneClasses[tone]}`}>
      <span className="size-1.5 rounded-full" aria-hidden="true" />
      {label}
    </span>
  );
}
