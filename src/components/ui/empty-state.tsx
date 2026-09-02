import type { ReactNode } from "react";

export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="border-y border-[var(--border)] py-10 text-center">
      <h2 className="font-display text-3xl text-[var(--foreground)]">{title}</h2>
      <div className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--foreground-soft)]">{children}</div>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
