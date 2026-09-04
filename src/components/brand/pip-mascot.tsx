"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { useSyncExternalStore } from "react";

export type PipPose = "neutral" | "listening" | "checking" | "explaining" | "attentive" | "safe-stop" | "ready";
export type PipSurface = "light" | "dark" | "lime";
export type PipSize = "sm" | "md" | "lg";
export type PipForm = "compact" | "full";

type AccessibleArtwork =
  | { decorative?: true; label?: never }
  | { decorative: false; label: string };

type PipMascotProps = AccessibleArtwork & {
  pose: PipPose;
  size?: PipSize;
  form?: PipForm;
  surface?: PipSurface;
  active?: boolean;
  className?: string;
};

type PipMarkProps = AccessibleArtwork & {
  size?: "sm" | "md";
  surface?: PipSurface;
  className?: string;
};

const pipPoseSources: Record<PipPose, string> = {
  neutral: "/media/pip-v1/poses/pip-v1-pose-neutral.png",
  listening: "/media/pip-v1/poses/pip-v1-pose-listening.png",
  checking: "/media/pip-v1/poses/pip-v1-pose-checking.png",
  explaining: "/media/pip-v1/poses/pip-v1-pose-explaining.png",
  attentive: "/media/pip-v1/poses/pip-v1-pose-attentive.png",
  "safe-stop": "/media/pip-v1/poses/pip-v1-pose-safe-stop.png",
  ready: "/media/pip-v1/poses/pip-v1-pose-ready.png",
};

const mascotSizes: Record<PipSize, string> = {
  sm: "h-20 w-24",
  md: "h-32 w-36",
  lg: "h-44 w-52",
};

const markSizes = { sm: "size-5", md: "size-7" } as const;
const subscribeToHydration = () => () => undefined;

function artworkA11y(decorative: boolean | undefined, label: string | undefined) {
  return decorative === false
    ? { role: "img" as const, "aria-label": label }
    : { "aria-hidden": true as const };
}

export function PipMark({ size = "sm", surface = "light", decorative = true, label, className = "" }: PipMarkProps) {
  const monochrome = surface === "lime";
  const scale = surface === "dark" ? "var(--pip-armour-on-dark)" : "var(--pip-armour)";
  const body = monochrome ? "var(--pip-mark-on-lime)" : "var(--pip-purpose)";
  const feature = monochrome ? "var(--pip-body)" : "var(--pip-feature)";

  return (
    <svg viewBox="0 0 64 64" className={markSizes[size] + " shrink-0 " + className} data-pip-mark="true" data-pip-surface={surface} focusable="false" {...artworkA11y(decorative, label)}>
      <path data-pip-region="armour" d="M11 22C12 10 21 4 31 9c6 3 8 8 5 14-8 7-17 8-25 4Z" fill={scale} />
      <path data-pip-region="armour" d="M8 35c1-11 10-18 21-16 7 1 11 7 9 13-7 9-19 12-28 8Z" fill={scale} />
      <path data-pip-region="armour" d="M12 48c3-10 12-15 22-11 6 3 8 8 4 13-8 7-19 9-26 4Z" fill={scale} />
      <path data-pip-region="body" d="M24 16c11-7 25-5 33 4 4 5 6 10 10 12 5 2 7 7 4 11-4 6-12 7-18 4-5 8-14 11-23 8-10-3-15-13-12-23 1-6 2-12 6-16Z" fill={body} />
      <circle cx="46" cy="27" r="6" fill="var(--pip-eye)" />
      <circle cx="48" cy="28" r="2.75" fill={feature} />
      <circle cx="49" cy="26" r="1" fill="var(--pip-eye)" />
      <circle cx="62" cy="36" r="2.5" fill={feature} />
      <path d="M48 41q7 5 13 0" fill="none" stroke={feature} strokeWidth="2" strokeLinecap="round" />
      <circle data-pip-region="purpose" cx="25" cy="47" r="5" fill="none" stroke="var(--pip-eye)" strokeWidth="2.5" />
    </svg>
  );
}

function expressionFor(pose: PipPose) {
  if (pose === "safe-stop") return "concerned";
  if (pose === "checking" || pose === "attentive") return "focused";
  if (pose === "ready") return "settled";
  if (pose === "explaining") return "speaking";
  return "open";
}

function PipPoseArtwork({ pose, form }: { pose: PipPose; form: PipForm }) {
  return (
    <div className={`absolute inset-0 ${form === "full" ? "overflow-visible" : "overflow-hidden"}`} data-pip-pose-source={pipPoseSources[pose]}>
      {form === "full" ? <span className="absolute bottom-[3%] left-1/2 z-0 h-[7%] w-[52%] -translate-x-1/2 rounded-full bg-[var(--pip-contact-shadow)] blur-[5px]" data-pip-ground-shadow="true" aria-hidden="true" /> : null}
      <Image
        src={pipPoseSources[pose]}
        alt=""
        fill
        sizes={form === "full" ? "(max-width: 767px) 208px, 208px" : "96px"}
        className={`pointer-events-none z-10 select-none object-contain ${form === "full" ? "p-1" : "scale-[1.18] translate-y-[6%]"}`}
        draggable={false}
      />
    </div>
  );
}

function PipArtwork({ pose, allowMotion, form }: { pose: PipPose; allowMotion: boolean; form: PipForm }) {
  const posture = !allowMotion
    ? { x: 0, y: 0 }
    : pose === "listening"
      ? { x: -1, y: 0 }
      : pose === "checking"
        ? { x: 1, y: 0 }
        : pose === "safe-stop"
          ? { x: -1, y: 1 }
          : pose === "ready"
            ? { x: 0, y: [0, 1, 0] }
            : { x: 0, y: 0 };

  return (
    <motion.div
      className="relative h-full aspect-square overflow-visible"
      data-pip-artwork-layer="true"
      data-pip-canonical-view="pose-specific"
      initial={false}
      animate={posture}
      transition={{ duration: allowMotion ? pose === "ready" ? 0.42 : 0.22 : 0, ease: [0.16, 1, 0.3, 1] }}
      aria-hidden="true"
    >
      <PipPoseArtwork pose={pose} form={form} />
    </motion.div>
  );
}

export function PipMascot({ pose, size = "md", form, surface = "light", active = false, decorative = true, label, className = "" }: PipMascotProps) {
  const reduceMotion = useReducedMotion();
  const motionReady = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const allowMotion = motionReady && !reduceMotion;
  const artwork = form ?? (size === "sm" ? "compact" : "full");

  return (
    <span
      className={"relative inline-grid shrink-0 place-items-center " + mascotSizes[size] + " " + className}
      data-pip-pose={pose}
      data-pip-surface={surface}
      data-pip-active={active ? "true" : "false"}
      data-pip-artwork={artwork}
      data-pip-expression={expressionFor(pose)}
      data-pip-model="preferred-v1-pose-set"
      {...artworkA11y(decorative, label)}
    >
      <PipArtwork pose={pose} allowMotion={allowMotion} form={artwork} />
    </span>
  );
}
