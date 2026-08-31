"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { Button } from "./button";

export function Drawer({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialog.current) return;
      const focusable = Array.from(dialog.current.querySelectorAll<HTMLElement>("button, a[href], [tabindex]:not([tabindex='-1'])"));
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); previous?.focus(); };
  }, [onClose, open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="drawer-title" className="h-full w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-[#0d1711] p-6 shadow-2xl sm:p-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h2 id="drawer-title" className="text-2xl font-semibold text-white">{title}</h2>
          <Button ref={closeButton} variant="ghost" onClick={onClose} aria-label="Close panel">Close</Button>
        </div>
        {children}
      </div>
    </div>
  );
}
