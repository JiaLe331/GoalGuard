import { Plus } from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";

export function Accordion({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="group border-t border-[var(--border)] py-4" open={open}>
      <summary className="flex min-h-11 list-none items-center justify-between gap-4 text-sm font-semibold text-[color:var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-4">
        {title}
        <Plus className="size-4 shrink-0 transition-transform duration-[var(--duration-fast)] group-open:rotate-45" aria-hidden="true" />
      </summary>
      <div className="pb-2 pt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">{children}</div>
    </details>
  );
}
