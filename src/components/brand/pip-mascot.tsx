"use client";

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

function surfacePalette(surface: PipSurface) {
  if (surface === "dark") {
    return { armour: "var(--pip-armour-on-dark)", outline: "var(--pip-outline-on-dark)", stage: "transparent" };
  }
  return {
    armour: "var(--pip-armour)",
    outline: "var(--pip-outline)",
    stage: surface === "lime" ? "var(--pip-stage-on-lime)" : "transparent",
  };
}

export function PipMark({ size = "sm", surface = "light", decorative = true, label, className = "" }: PipMarkProps) {
  const monochrome = surface === "lime";
  const scale = surface === "dark" ? "var(--pip-armour-on-dark)" : "var(--pip-armour)";
  const body = monochrome ? "var(--pip-mark-on-lime)" : "var(--pip-purpose)";
  const outline = monochrome ? "var(--pip-mark-on-lime)" : scale;
  const eye = monochrome ? "var(--pip-body)" : "var(--pip-feature)";
  return (
    <svg viewBox="0 0 64 64" className={`${markSizes[size]} shrink-0 ${className}`} data-pip-mark="true" data-pip-surface={surface} focusable="false" {...artworkA11y(decorative, label)}>
      <path data-pip-region="armour" d="M8 17C12 7 23 4 31 10c4 3 5 8 2 12-7 7-17 9-24 4-3-2-3-6-1-9Z" fill={scale} />
      <path data-pip-region="armour" d="M6 31c2-10 12-16 21-13 6 2 9 7 7 12-6 8-17 12-25 8-4-2-5-4-3-7Z" fill={scale} />
      <path data-pip-region="armour" d="M10 45c3-9 12-14 21-11 6 2 8 7 6 12-7 7-17 10-24 6-4-2-5-4-3-7Z" fill={scale} />
      <path data-pip-region="body" d="M23 17c9-8 22-8 31-1 4 3 6 8 8 11 1 2 4 3 7 4 5 2 6 7 3 10-4 4-10 5-15 3-4 8-11 13-20 13-12 0-21-8-20-18 0-8 2-17 6-22Z" fill={body} stroke={outline} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M43 22c4-2 9-1 11 2" fill="none" stroke={outline} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="49" cy="27" r="3" fill={eye} />
      <circle data-pip-region="purpose" cx="23" cy="46" r="5" fill={body} stroke={monochrome ? body : "var(--pip-eye)"} strokeWidth="2.5" />
    </svg>
  );
}

type PipPalette = ReturnType<typeof surfacePalette>;

function expressionFor(pose: PipPose) {
  if (pose === "safe-stop") return "concerned";
  if (pose === "checking" || pose === "attentive") return "focused";
  if (pose === "ready") return "settled";
  if (pose === "explaining") return "speaking";
  return "open";
}

function Face({ pose, allowMotion, large = false }: { pose: PipPose; allowMotion: boolean; large?: boolean }) {
  const expression = expressionFor(pose);
  const focused = expression === "focused";
  const concerned = expression === "concerned";
  const speaking = expression === "speaking";
  const eyeX = large ? 290 : 278;
  const eyeY = large ? 142 : 143;
  const pupilShift = pose === "listening" ? -4 : focused ? 5 : 0;
  return (
    <g data-pip-face={expression}>
      <ellipse cx={eyeX} cy={eyeY} rx={large ? 27 : 22} ry={large ? 30 : 24} fill="var(--pip-eye)" />
      <motion.circle cx={eyeX + 4} cy={eyeY + 3} r={large ? 11 : 9} fill="var(--pip-feature)" animate={allowMotion ? { x: pupilShift } : { x: 0 }} transition={{ duration: allowMotion ? 0.2 : 0 }} />
      <circle cx={eyeX + 8} cy={eyeY - 2} r={large ? 4 : 3} fill="var(--pip-eye)" />
      <path d={concerned ? `M${eyeX - 24} ${eyeY - 29}q24-15 48 1` : focused ? `M${eyeX - 23} ${eyeY - 27}q24 0 47 10` : `M${eyeX - 23} ${eyeY - 27}q24-8 47 4`} fill="none" stroke="var(--pip-feature)" strokeWidth={large ? 9 : 7} strokeLinecap="round" />
      <circle cx={large ? 379 : 363} cy="184" r={large ? 8 : 7} fill="var(--pip-feature)" />
      {speaking ? <ellipse cx={large ? 335 : 325} cy={large ? 205 : 204} rx={large ? 15 : 12} ry={large ? 11 : 9} fill="var(--pip-feature)" /> : <path d={concerned ? `M${large ? 313 : 305} 207q22-15 43 1` : focused ? `M${large ? 315 : 307} 204q20 5 39-2` : `M${large ? 313 : 305} 201q22 18 44 0`} fill="none" stroke="var(--pip-feature)" strokeWidth={large ? 7 : 6} strokeLinecap="round" />}
    </g>
  );
}

function ActivityPoints({ active, allowMotion, compact = false }: { active: boolean; allowMotion: boolean; compact?: boolean }) {
  const startX = compact ? 349 : 368;
  const startY = compact ? 300 : 314;
  const gap = compact ? 31 : 30;
  return (
    <g data-pip-accessory="checking">
      {[0, 1, 2].map((index) => <motion.circle key={index} data-pip-activity-point="true" cx={startX + index * gap} cy={startY - index * 10} r={compact ? 8 : 9} fill={index === 1 ? "var(--pip-eye)" : "var(--pip-purpose)"} animate={allowMotion && active ? { opacity: [0.3, 1, 0.3], scale: [0.85, 1, 0.85] } : { opacity: 1, scale: 1 }} transition={{ duration: 1.1, repeat: allowMotion && active ? Infinity : 0, delay: allowMotion ? index * 0.18 : 0, ease: "easeInOut" }} style={{ transformOrigin: `${startX + index * gap}px ${startY - index * 10}px` }} />)}
    </g>
  );
}

function PoseAccessory({ pose, active, allowMotion, palette, surface, compact = false }: { pose: PipPose; active: boolean; allowMotion: boolean; palette: PipPalette; surface: PipSurface; compact?: boolean }) {
  if (pose === "listening") return <motion.g data-pip-accessory="listening" initial={false} animate={allowMotion ? { opacity: [0, 1], x: [7, 0] } : { opacity: 1, x: 0 }} transition={{ duration: allowMotion ? 0.22 : 0 }}><path d={compact ? "M58 103c-23 18-26 47-8 68M30 81c-38 30-42 78-11 109" : "M87 118c-24 16-27 46-9 67M56 91c-40 30-45 79-13 113"} fill="none" stroke={palette.outline} strokeWidth={compact ? 9 : 10} strokeLinecap="round" /></motion.g>;
  if (pose === "checking") return <ActivityPoints active={active} allowMotion={allowMotion} compact={compact} />;
  if (pose === "explaining") return <g data-pip-accessory="explaining">{[0, 1, 2].map((index) => <motion.path key={index} d={compact ? `M352 ${251 + index * 29}h${78 - index * 15}` : `M368 ${245 + index * 31}h${78 - index * 15}`} stroke={index === 0 ? "var(--pip-purpose)" : palette.outline} strokeWidth={compact ? 9 : 10} strokeLinecap="round" initial={false} animate={allowMotion ? { opacity: [0, 1], x: [-8, 0] } : { opacity: 1, x: 0 }} transition={{ duration: allowMotion ? 0.22 : 0, delay: allowMotion ? index * 0.035 : 0 }} />)}</g>;
  if (pose === "attentive") return <motion.g data-pip-accessory="attentive" initial={false} animate={{ scale: active && allowMotion ? [0.96, 1.02, 1] : 1 }} transition={{ duration: allowMotion ? 0.22 : 0 }} style={{ transformOrigin: compact ? "388px 284px" : "393px 306px" }}><rect x={compact ? 346 : 352} y={compact ? 224 : 244} width="84" height={compact ? 118 : 112} rx="18" fill={palette.armour} /><path d={compact ? "M369 255h39M369 277h28" : "M374 274h39M374 297h29"} stroke={surface === "dark" ? "var(--pip-feature)" : "var(--pip-eye)"} strokeWidth="8" strokeLinecap="round" /><circle cx={compact ? 388 : 394} cy={compact ? 313 : 329} r="13" fill="var(--pip-purpose)" /></motion.g>;
  if (pose === "safe-stop") return <motion.g data-pip-accessory="safe-stop" initial={false} animate={allowMotion ? { opacity: [0, 1], y: [8, 0] } : { opacity: 1, y: 0 }} transition={{ duration: allowMotion ? 0.22 : 0 }}><circle cx={compact ? 385 : 391} cy={compact ? 280 : 304} r={compact ? 43 : 42} fill="var(--pip-warning-surface)" stroke="var(--pip-warning)" strokeWidth="6" /><path d={compact ? "M385 258v27M385 300h.1" : "M391 281v28M391 324h.1"} stroke="var(--pip-warning)" strokeWidth="10" strokeLinecap="round" /></motion.g>;
  if (pose === "ready") return <path data-pip-accessory="ready" d={compact ? "M344 313h94" : "M355 355h88"} stroke="var(--pip-purpose)" strokeWidth="12" strokeLinecap="round" />;
  return null;
}

function CompactPipArtwork({ pose, surface, active, allowMotion, palette }: { pose: PipPose; surface: PipSurface; active: boolean; allowMotion: boolean; palette: PipPalette }) {
  const posture = !allowMotion ? { x: 0, y: 0, rotate: 0 } : pose === "listening" ? { x: -3, y: 0, rotate: 3 } : pose === "checking" ? { x: 8, y: 2, rotate: -2 } : pose === "attentive" ? { x: 6, y: 4, rotate: 2 } : pose === "safe-stop" ? { x: -7, y: 7, rotate: -4 } : pose === "ready" ? { x: 0, y: [0, 3, 0], rotate: 0 } : { x: 0, y: 0, rotate: 0 };
  return (
    <motion.svg viewBox="0 0 480 400" className="block size-full overflow-visible" focusable="false" initial={false} animate={allowMotion ? { opacity: [0, 1], y: [4, 0] } : { opacity: 1, y: 0 }} transition={{ duration: allowMotion ? 0.22 : 0, ease: [0.16, 1, 0.3, 1] }} aria-hidden="true">
      <circle cx="240" cy="200" r="190" fill={palette.stage} />
      <motion.g animate={posture} transition={{ duration: allowMotion ? pose === "ready" ? 0.42 : 0.22 : 0, ease: [0.16, 1, 0.3, 1] }} style={{ transformOrigin: "230px 205px" }}>
        <path data-pip-region="armour" d="M68 120c9-48 46-76 91-74 32 2 51 20 52 45-27 39-70 58-115 48-22-5-32-12-28-19ZM55 190c5-46 38-76 83-79 32-2 52 14 57 39-20 42-60 67-106 62-23-2-36-10-34-22ZM69 257c8-43 42-69 85-69 30 1 48 17 51 41-22 39-63 60-106 53-22-4-33-12-30-25Z" fill={palette.armour} />
        <path data-pip-region="body" d="M154 111c38-35 96-40 137-11 19 13 29 33 40 49 6 9 17 14 33 20 18 7 23 25 13 39-13 18-38 24-64 19-13 39-44 68-87 73-49 6-89-22-95-64-6-38 8-94 43-125Z" fill="var(--pip-body)" stroke={palette.outline} strokeWidth="9" strokeLinejoin="round" />
        <Face pose={pose} allowMotion={allowMotion} />
        <circle data-pip-region="purpose" cx="111" cy="255" r="16" fill="var(--pip-purpose)" stroke="var(--pip-eye)" strokeWidth="7" />
      </motion.g>
      <PoseAccessory pose={pose} active={active} allowMotion={allowMotion} palette={palette} surface={surface} compact />
    </motion.svg>
  );
}

function FullPipArtwork({ pose, surface, active, allowMotion, palette }: { pose: PipPose; surface: PipSurface; active: boolean; allowMotion: boolean; palette: PipPalette }) {
  const posture = !allowMotion ? { x: 0, y: 0, rotate: 0 } : pose === "listening" ? { x: -5, y: 0, rotate: 4 } : pose === "checking" ? { x: 8, y: 5, rotate: -3 } : pose === "attentive" ? { x: 7, y: 5, rotate: 3 } : pose === "safe-stop" ? { x: -7, y: 7, rotate: -4 } : pose === "explaining" ? { x: 0, y: -4, rotate: -1 } : pose === "ready" ? { x: 0, y: [0, 3, 0], rotate: 0 } : { x: 0, y: 0, rotate: 0 };
  const arm = pose === "explaining" ? "M300 280q40-7 62-39" : pose === "checking" ? "M301 286q31 8 47 31" : pose === "attentive" ? "M298 286q23 12 31 38" : pose === "safe-stop" ? "M300 286q-14 34-47 43" : "M301 280q25 22 13 55";
  const leftArm = pose === "safe-stop" ? "M188 276q8 38 45 53" : "M187 276q-13 31 7 57";
  return (
    <motion.svg viewBox="0 0 480 480" className="block size-full overflow-visible" focusable="false" initial={false} animate={posture} transition={{ duration: allowMotion ? pose === "ready" ? 0.42 : 0.22 : 0, ease: [0.16, 1, 0.3, 1] }} style={{ transformOrigin: "52% 54%" }} aria-hidden="true">
      <circle cx="240" cy="240" r="218" fill={palette.stage} />
      <ellipse cx="246" cy="429" rx="137" ry="17" fill={palette.outline} opacity={surface === "dark" ? 0.2 : 0.12} />
      <path data-pip-region="tail" d={pose === "safe-stop" ? "M180 323C101 319 53 353 67 397c12 39 66 49 112 19 20-13 35-29 48-48-34-9-51-24-47-45Z" : "M178 322C94 306 47 345 63 390c14 42 75 53 129 18 22-14 39-31 52-51-29-3-53-15-66-35Z"} fill={palette.armour} />
      <path d="M105 384c31 10 67-4 96-37" fill="none" stroke="var(--pip-body)" strokeWidth="13" strokeLinecap="round" />
      <path data-pip-region="body" d="M166 172c35-37 98-51 145-23 27 16 40 42 54 59 8 10 23 15 42 23 22 9 27 31 14 47-17 21-48 26-77 17 3 20 5 39 2 57-7 51-48 82-105 81-70-1-118-43-119-105-1-57 9-117 44-156Z" fill="var(--pip-body)" stroke={palette.outline} strokeWidth="10" strokeLinejoin="round" />
      <path data-pip-region="armour" d="M116 191c5-42 37-68 76-67 27 1 45 16 47 38-21 34-59 53-98 46-20-3-29-9-25-17ZM108 245c2-39 31-68 70-71 28-2 46 12 50 34-17 37-53 60-94 57-20-1-30-8-26-20ZM113 300c4-38 34-65 73-65 27 0 44 15 47 36-19 35-56 56-95 51-20-2-29-10-25-22Z" fill={palette.armour} />
      <Face pose={pose} allowMotion={allowMotion} large />
      <path d={leftArm} fill="none" stroke={palette.outline} strokeWidth="25" strokeLinecap="round" />
      <path d={arm} fill="none" stroke={palette.outline} strokeWidth="25" strokeLinecap="round" />
      <path d="M182 414q28 16 55 0M278 414q28 16 55 0" fill="none" stroke={palette.outline} strokeWidth="22" strokeLinecap="round" />
      <circle data-pip-region="purpose" cx="177" cy="349" r="15" fill="var(--pip-purpose)" stroke="var(--pip-eye)" strokeWidth="7" />
      <PoseAccessory pose={pose} active={active} allowMotion={allowMotion} palette={palette} surface={surface} />
    </motion.svg>
  );
}

export function PipMascot({ pose, size = "md", form, surface = "light", active = false, decorative = true, label, className = "" }: PipMascotProps) {
  const reduceMotion = useReducedMotion();
  const motionReady = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const allowMotion = motionReady && !reduceMotion;
  const palette = surfacePalette(surface);
  const artwork = form ?? (size === "sm" ? "compact" : "full");
  return (
    <span className={`relative inline-grid shrink-0 place-items-center ${mascotSizes[size]} ${className}`} data-pip-pose={pose} data-pip-surface={surface} data-pip-active={active ? "true" : "false"} data-pip-artwork={artwork} data-pip-expression={expressionFor(pose)} {...artworkA11y(decorative, label)}>
      {artwork === "compact" ? <CompactPipArtwork pose={pose} surface={surface} active={active} allowMotion={allowMotion} palette={palette} /> : <FullPipArtwork pose={pose} surface={surface} active={active} allowMotion={allowMotion} palette={palette} />}
    </span>
  );
}
