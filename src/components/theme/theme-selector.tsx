"use client";

import { Check, CircleHalf, Desktop, Moon, Sun } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";

import { useTheme } from "@/components/theme/theme-provider";
import type { ThemePreference } from "@/lib/frontend/theme";

const options = [
  { value: "system", label: "System", icon: Desktop },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

export function ThemeSelector({ compact = false }: { compact?: boolean }) {
  const { preference, setPreference } = useTheme();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--navbar-border)] bg-[var(--surface-muted)] px-3 text-sm font-semibold text-[color:var(--foreground)] transition-[background-color,transform] duration-[var(--duration-press)] hover:bg-[var(--surface-hover)] active:scale-[0.98]"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        aria-label="Choose appearance"
        onClick={() => setOpen((current) => !current)}
      >
        <CircleHalf className="size-5" aria-hidden="true" />
        {compact ? <span className="sr-only">Appearance</span> : <span>Appearance</span>}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            id={panelId}
            role="dialog"
            aria-label="Appearance"
            className="absolute right-0 top-[calc(100%+0.6rem)] z-[120] w-48 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-raised)] p-2 text-[color:var(--foreground)] shadow-[var(--shadow-float)]"
            initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0 : 0.15 }}
          >
            <fieldset>
              <legend className="px-2 pb-1 text-xs font-semibold uppercase tracking-[0.1em] text-[color:var(--foreground-muted)]">Use theme</legend>
              {options.map((option) => {
                const Icon = option.icon;
                const selected = preference === option.value;
                return (
                  <label key={option.value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-[var(--surface-muted)] focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-[var(--focus-ring)]">
                    <input
                      type="radio"
                      name="goalguard-theme"
                      value={option.value}
                      checked={selected}
                      onChange={() => { setPreference(option.value as ThemePreference); setOpen(false); trigger.current?.focus(); }}
                      className="sr-only"
                    />
                    <Icon className="size-5" aria-hidden="true" />
                    <span className="flex-1">{option.label}</span>
                    {selected ? <Check className="size-4" weight="bold" aria-hidden="true" /> : null}
                  </label>
                );
              })}
            </fieldset>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
