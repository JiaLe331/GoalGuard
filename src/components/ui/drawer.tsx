"use client";

import { X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";

import { Button } from "./button";

export function Drawer({ open, title, onClose, children, labelledId = "drawer-panel", restoreFocusRef }: { open: boolean; title: string; onClose: () => void; children: ReactNode; labelledId?: string; restoreFocusRef?: RefObject<HTMLElement | null> }) {
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const restoreFocusTarget = restoreFocusRef?.current ?? previous;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
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
    return () => { document.removeEventListener("keydown", handleKey); document.body.style.overflow = previousOverflow; restoreFocusTarget?.focus(); };
  }, [onClose, open, restoreFocusRef]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-end bg-[var(--scrim)] sm:items-stretch"
          role="presentation"
          initial={false}
          onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
        >
          <motion.div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            id={labelledId}
            aria-labelledby={`${labelledId}-title`}
            className="max-h-[calc(100dvh-max(1rem,env(safe-area-inset-top)))] min-w-0 w-full max-w-full overflow-x-hidden overflow-y-auto rounded-t-[var(--radius-feature)] border border-[var(--border)] bg-[var(--background)] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 shadow-[var(--shadow-float-strong)] sm:h-full sm:max-h-none sm:max-w-2xl sm:rounded-none sm:border-y-0 sm:border-r-0 sm:p-8"
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 16 }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--border-strong)] sm:hidden" aria-hidden="true" />
            <div className="mb-6 flex items-center justify-between gap-4 sm:mb-8">
              <h2 id={`${labelledId}-title`} className="text-2xl font-semibold tracking-[-0.045em] text-[color:var(--foreground)] sm:text-3xl">{title}</h2>
              <Button ref={closeButton} variant="ghost" className="size-11 px-0" onClick={onClose} aria-label="Close panel"><X className="size-5" aria-hidden="true" /></Button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
