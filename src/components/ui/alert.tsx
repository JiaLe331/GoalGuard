import { CheckCircle, Info, Warning, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { HTMLAttributes, ReactNode } from "react";

const tones = {
  info: "border-[var(--border)] bg-[var(--surface-muted)] text-[color:var(--foreground-soft)]",
  warning: "border-[var(--warning)] bg-[var(--warning-surface)] text-[color:var(--foreground-soft)]",
  error: "border-[var(--negative)] bg-[var(--negative-surface)] text-[color:var(--foreground-soft)]",
  success: "border-[var(--positive)] bg-[var(--positive-surface)] text-[color:var(--foreground-soft)]",
};

const icons = { info: Info, warning: Warning, error: WarningCircle, success: CheckCircle };

export function Alert({
  title,
  tone = "info",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { title?: string; tone?: keyof typeof tones; children: ReactNode }) {
  const Icon = icons[tone];
  return (
    <div className={`flex items-start gap-3 rounded-[var(--radius-control)] border p-4 text-sm leading-6 ${tones[tone]}`} role={tone === "error" ? "alert" : "status"} {...props}>
      <Icon className="mt-0.5 size-5 shrink-0" weight="regular" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold text-[color:var(--foreground)]">{title}</p> : null}
        <div className={title ? "mt-1" : ""}>{children}</div>
      </div>
    </div>
  );
}
