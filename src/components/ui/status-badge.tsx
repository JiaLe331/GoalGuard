export type StatusTone = "ready" | "warning" | "error" | "neutral";

const toneClasses: Record<StatusTone, string> = {
  ready: "border-[#91e95f]/25 bg-[#91e95f]/10 text-[#caff9f]",
  warning: "border-[#ffcd6b]/25 bg-[#ffcd6b]/10 text-[#ffe0a3]",
  error: "border-[#ff837a]/25 bg-[#ff837a]/10 text-[#ffaaa4]",
  neutral: "border-white/10 bg-white/[0.05] text-[#bdc9c0]",
};

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: StatusTone }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}
