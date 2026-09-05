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
  className = "",
  compact = false,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { title?: string; tone?: keyof typeof tones; compact?: boolean; children: ReactNode }) {
  const Icon = icons[tone];
  // `className` is merged rather than spread through `props`. Spreading it last let a caller's
  // layout class (`className="mt-5"`) replace the whole attribute, silently stripping every
  // alert that positioned itself of its tone colour, border, padding and text size.
  return (
    <div className={`flex items-start gap-3 rounded-[var(--radius-control)] border ${compact ? "p-3 text-xs leading-5" : "p-4 text-sm leading-6"} ${tones[tone]} ${className}`} role={tone === "error" ? "alert" : "status"} {...props}>
      <Icon className="mt-0.5 size-5 shrink-0" weight="regular" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold text-[color:var(--foreground)]">{title}</p> : null}
        <div className={title ? "mt-1" : ""}>{children}</div>
      </div>
    </div>
  );
}
