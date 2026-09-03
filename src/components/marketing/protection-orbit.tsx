"use client";

import { Check, ShieldCheck } from "@phosphor-icons/react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { PointerEvent } from "react";

export function ProtectionOrbit() {
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 170, damping: 22, mass: 0.55 });
  const springY = useSpring(pointerY, { stiffness: 170, damping: 22, mass: 0.55 });
  const rotateY = useTransform(springX, [-1, 1], [-4, 4]);
  const rotateX = useTransform(springY, [-1, 1], [4, -4]);
  const purposeX = useTransform(springX, [-1, 1], [-3, 3]);
  const purposeY = useTransform(springY, [-1, 1], [-2, 2]);
  const reviewX = useTransform(springX, [-1, 1], [3, -3]);
  const reviewY = useTransform(springY, [-1, 1], [2, -2]);

  function updatePointer(event: PointerEvent<HTMLDivElement>) {
    if (reduceMotion || event.pointerType === "touch" || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1);
    pointerY.set(((event.clientY - bounds.top) / bounds.height) * 2 - 1);
  }

  function resetPointer() {
    pointerX.set(0);
    pointerY.set(0);
  }

  return (
    <motion.div
      className="protection-orbit relative min-h-[20rem] overflow-hidden rounded-[var(--radius-feature)] bg-[var(--accent-soft)] text-[color:var(--accent-soft-foreground)] sm:min-h-[23rem]"
      aria-label="GoalGuard keeps your purpose, reviewed option, and unsigned preview connected"
      onPointerMove={updatePointer}
      onPointerLeave={resetPointer}
      style={{ rotateX: reduceMotion ? 0 : rotateX, rotateY: reduceMotion ? 0 : rotateY, transformPerspective: 900 }}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.42, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute -bottom-36 -right-24 size-[25rem] rounded-full border-[4.75rem] border-[var(--accent)] sm:-right-8 sm:size-[30rem]" aria-hidden="true" />
      <div className="absolute right-[12%] top-7 grid size-14 place-items-center rounded-full border border-[color-mix(in_srgb,var(--foreground)_24%,transparent)] bg-[var(--accent)]" aria-hidden="true"><ShieldCheck className="size-7" /></div>
      <svg className="absolute left-6 top-8 h-24 w-40 sm:left-10" viewBox="0 0 170 100" fill="none" aria-hidden="true">
        <path d="M4 72C32 33 59 30 83 57c22 25 51 20 83-28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="4" cy="72" r="3" fill="currentColor" /><circle cx="166" cy="29" r="3" fill="currentColor" />
      </svg>

      <motion.div className="absolute left-4 top-28 w-[78%] rounded-3xl bg-[var(--hero-module-bg)] p-5 text-[color:var(--hero-module-fg)] shadow-[var(--shadow-float)] sm:left-10 sm:top-32 sm:w-[62%] sm:p-6" style={{ x: purposeX, y: purposeY }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[color:var(--foreground-muted)]">01 · Purpose attached</p>
            <p className="mt-1 text-lg font-semibold tracking-[-0.03em]">Your goal sets the guardrail</p>
          </div>
          <span className="brand-mark" aria-hidden="true" />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {["Cost limit", "Loss limit", "Deadline"].map((label) => <div key={label} className="rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-xs font-semibold">{label}</div>)}
        </div>
      </motion.div>

      <motion.div className="absolute bottom-5 right-4 w-[64%] rounded-3xl bg-[var(--surface-strong)] p-5 text-[color:var(--foreground-on-strong)] shadow-[var(--shadow-float-strong)] sm:bottom-8 sm:right-8 sm:w-[48%]" style={{ x: reviewX, y: reviewY }}>
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[color:var(--foreground-on-strong-muted)]">02 · Independent review</p>
        <p className="mt-2 text-xl font-medium tracking-[-0.04em]">3 checks. One clear boundary.</p>
        <div className="mt-5 space-y-2">
          {["Fit", "Risk", "Clarity"].map((label, index) => <div key={label} className="flex items-center gap-2 text-xs text-[color:var(--foreground-on-strong-muted)]"><span className="grid size-5 place-items-center rounded-full bg-[var(--accent)] text-[color:var(--accent-foreground)]"><Check className="size-3" aria-hidden="true" /></span>{index + 1}. {label}</div>)}
        </div>
      </motion.div>
    </motion.div>
  );
}
