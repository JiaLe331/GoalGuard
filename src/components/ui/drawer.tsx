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
          className="pointer-events-auto fixed inset-0 z-[100] flex items-end justify-end bg-[var(--scrim)] sm:items-stretch"
          role="presentation"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
        >
          <motion.div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            id={labelledId}
            aria-labelledby={`${labelledId}-title`}
            className="max-h-[calc(100dvh-max(1rem,env(safe-area-inset-top)))] min-w-0 w-full max-w-full overflow-x-hidden overflow-y-auto rounded-t-[var(--radius-feature)] border border-[var(--border)] bg-[var(--background)] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 shadow-[var(--shadow-float-strong)] sm:h-full sm:max-h-none sm:max-w-2xl sm:rounded-none sm:border-y-0 sm:border-r-0 sm:p-8"
            style={{ transformOrigin: "right center" }}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.99 }}
            transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--border-strong)] sm:hidden" aria-hidden="true" />
            <div className="sticky top-0 z-20 mb-6 flex min-w-0 items-center justify-between gap-4 bg-[var(--background)] pb-2 sm:mb-8">
              <h2 id={`${labelledId}-title`} className="min-w-0 text-[1.375rem] font-semibold leading-tight tracking-[-0.045em] text-[color:var(--foreground)] min-[360px]:text-2xl sm:text-3xl">{title}</h2>
              <Button ref={closeButton} variant="secondary" className="shrink-0 px-3 min-[360px]:px-4" onClick={onClose} aria-label="Close panel"><X className="size-5" aria-hidden="true" /><span className="hidden min-[360px]:inline">Close</span></Button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
