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
    return () => { document.removeEventListener("keydown", handleKey); document.body.style.overflow = previousOverflow; (restoreFocusRef?.current ?? previous)?.focus(); };
  }, [onClose, open, restoreFocusRef]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex justify-end bg-[color-mix(in_srgb,var(--surface-black)_72%,transparent)]"
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
            className="h-full w-full max-w-2xl overflow-y-auto border-l border-[var(--border)] bg-[var(--background)] p-6 shadow-[var(--shadow-hero-module)] sm:p-8"
            initial={reduceMotion ? false : { x: 28 }}
            animate={{ x: 0 }}
            exit={{ x: 20 }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-8 flex items-center justify-between gap-4">
              <h2 id={`${labelledId}-title`} className="font-display text-3xl text-[var(--foreground)]">{title}</h2>
              <Button ref={closeButton} variant="ghost" className="size-11 px-0" onClick={onClose} aria-label="Close panel"><X className="size-5" aria-hidden="true" /></Button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
