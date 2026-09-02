import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] border border-[var(--editorial-card-border)] bg-[var(--editorial-card-bg)] text-[var(--editorial-card-fg)] ${className}`}
      {...props}
    />
  );
}
