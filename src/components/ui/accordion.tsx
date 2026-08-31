import type { ReactNode } from "react";

export function Accordion({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="group rounded-2xl border border-white/[0.08] bg-black/10 p-4" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4">
        {title}
        <span className="text-[var(--accent)] transition group-open:rotate-45" aria-hidden="true">+</span>
      </summary>
      <div className="mt-4 border-t border-white/[0.07] pt-4 text-sm leading-6 text-[#aebcb2]">{children}</div>
    </details>
  );
}
