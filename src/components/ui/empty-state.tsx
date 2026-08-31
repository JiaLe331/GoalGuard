import type { ReactNode } from "react";

export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-[1.4rem] border border-dashed border-white/15 bg-white/[0.025] p-7 text-center">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">{children}</div>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
