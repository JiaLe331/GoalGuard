"use client";

import { ArrowRight, FirstAidKit, GraduationCap, House, type Icon } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { NiulaiMascot } from "@/components/brand/niulai-mascot";

const examples = [
  { category: "Rent", message: "Protect next month’s rent.", icon: House },
  { category: "Tuition", message: "Keep my tuition fund steady.", icon: GraduationCap },
  { category: "Emergency", message: "Guard my emergency savings.", icon: FirstAidKit },
] as const satisfies ReadonlyArray<{ category: string; message: string; icon: Icon }>;

const characterDelayMs = 60;
const exampleHoldMs = 1_100;
const finalExampleIndex = 2;
const finalExample = examples[finalExampleIndex];

export function GoalPreview() {
  const previewRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(finalExampleIndex);
  const [typedMessage, setTypedMessage] = useState<string>(finalExample.message);
  const [typing, setTyping] = useState(false);
  const [readyToAnimate, setReadyToAnimate] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [interactionPaused, setInteractionPaused] = useState(false);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

    const showFinalExample = () => {
      setActiveIndex(finalExampleIndex);
      setTypedMessage(finalExample.message);
      setTyping(false);
    };

    const handleMotionPreference = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
      if (event.matches) {
        observer?.disconnect();
        setReadyToAnimate(false);
        showFinalExample();
      } else {
        setReadyToAnimate(true);
      }
    };

    setReducedMotion(motionPreference.matches);
    motionPreference.addEventListener("change", handleMotionPreference);

    if (motionPreference.matches) {
      showFinalExample();
    } else if (!("IntersectionObserver" in window)) {
      fallbackTimer = setTimeout(() => setReadyToAnimate(true), 0);
    } else {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return;
          observer?.disconnect();
          setReadyToAnimate(true);
        },
        { threshold: 0.35 },
      );
      observer.observe(preview);
    }

    return () => {
      observer?.disconnect();
      if (fallbackTimer !== undefined) clearTimeout(fallbackTimer);
      motionPreference.removeEventListener("change", handleMotionPreference);
    };
  }, []);

  useEffect(() => {
    if (!readyToAnimate || reducedMotion || interactionPaused) return;

    let cancelled = false;
    let timer: number | undefined;

    const typeExample = (exampleIndex: number, characterIndex: number) => {
      if (cancelled) return;
      const example = examples[exampleIndex] ?? examples[0];

      setActiveIndex(exampleIndex);
      if (characterIndex === 0) setTypedMessage("");

      if (characterIndex < example.message.length) {
        setTyping(true);
        timer = window.setTimeout(() => {
          const nextCharacter = characterIndex + 1;
          setTypedMessage(example.message.slice(0, nextCharacter));
          typeExample(exampleIndex, nextCharacter);
        }, characterDelayMs);
        return;
      }

      setTyping(false);
      timer = window.setTimeout(() => {
        typeExample((exampleIndex + 1) % examples.length, 0);
      }, exampleHoldMs);
    };

    typeExample(0, 0);

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [interactionPaused, readyToAnimate, reducedMotion]);

  return (
    <div
      ref={previewRef}
      data-testid="goal-preview"
      aria-labelledby="goal-preview-heading"
      onMouseEnter={() => setInteractionPaused(true)}
      onMouseLeave={() => setInteractionPaused(false)}
      onFocusCapture={() => setInteractionPaused(true)}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          setInteractionPaused(false);
        }
      }}
    >
      <div className="grid grid-cols-1 items-end gap-1 min-[440px]:grid-cols-[minmax(0,1fr)_6.5rem] min-[440px]:gap-4">
        <div>
          <p className="section-eyebrow text-[color:var(--foreground-muted)]">GoalGuard in action</p>
          <h2 id="goal-preview-heading" className="mt-3 text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-[1.05] tracking-[-0.045em] text-[color:var(--foreground)]">
            Start with what the money is for.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[color:var(--foreground-soft)]">
            Preview a few ways people can describe what matters. Open the guided app when you’re ready to define your own.
          </p>
        </div>
        <div className="relative grid min-h-24 w-28 justify-self-end place-items-end overflow-visible" aria-hidden="true">
          <span className="absolute inset-x-2 bottom-1 h-10 rounded-full bg-[var(--accent-soft)]" />
          <NiulaiMascot pose="explaining" size="sm" className="relative h-28 w-28" />
        </div>
      </div>

      <div className="mt-6 rounded-[var(--radius-card)] bg-[var(--surface-subtle)] p-4 sm:p-5">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[color:var(--foreground-muted)]">Example purposes</p>
        <div className="mt-3 flex flex-wrap gap-2" aria-hidden="true">
          {examples.map((example, index) => {
            const CategoryIcon = example.icon;
            const active = index === activeIndex;
            return (
              <span
                key={example.category}
                data-active={active}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-[background-color,border-color,color] duration-[var(--duration-enter)] ${active ? "border-[var(--accent)] bg-[var(--accent)] text-[color:var(--accent-foreground)]" : "border-[var(--surface-muted)] bg-[var(--surface-muted)] text-[color:var(--foreground-soft)]"}`}
              >
                <CategoryIcon className="size-4" weight={active ? "fill" : "regular"} />
                {example.category}
              </span>
            );
          })}
        </div>

        <div className="mt-4 min-h-36 rounded-[var(--radius-control)] border border-[var(--input-border)] bg-[var(--surface-raised)] px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-[color:var(--foreground-muted)]">Protection goal</p>
          <p data-testid="typed-goal-example" aria-hidden="true" className="mt-5 min-h-14 text-lg font-medium leading-7 tracking-[-0.025em] text-[color:var(--foreground)]">
            {typedMessage}
            {typing && !interactionPaused ? <span className="ml-0.5 inline-block h-5 w-0.5 translate-y-1 bg-[var(--foreground)] motion-safe:animate-pulse" /> : null}
          </p>
        </div>
      </div>

      <p className="sr-only">Examples include protecting rent, tuition, and emergency savings.</p>

      <div className="mt-5 grid gap-3">
        <Link
          href="/dashboard"
          className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full border border-[var(--button-primary-border)] bg-[var(--button-primary-bg)] px-6 text-sm font-semibold text-[color:var(--button-primary-fg)] transition-[background-color,opacity,transform] duration-[var(--duration-press)] hover:bg-[var(--button-primary-hover)] active:scale-[0.98] active:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        >
          Build my protection plan
          <ArrowRight aria-hidden="true" />
        </Link>
        <p className="text-center text-xs leading-5 text-[color:var(--foreground-soft)]">Opens the live protection workspace. No wallet connection is required to look around.</p>
      </div>
    </div>
  );
}
