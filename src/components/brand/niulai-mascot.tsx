"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { useSyncExternalStore } from "react";

export type NiulaiPose = "neutral" | "listening" | "checking" | "explaining" | "attentive" | "safe-stop" | "ready";
export type NiulaiSurface = "light" | "dark" | "lime";
export type NiulaiSize = "sm" | "md" | "lg";
export type NiulaiForm = "compact" | "full";

type AccessibleArtwork =
  | { decorative?: true; label?: never }
  | { decorative: false; label: string };

type NiulaiMascotProps = AccessibleArtwork & {
  pose: NiulaiPose;
  size?: NiulaiSize;
  form?: NiulaiForm;
  surface?: NiulaiSurface;
  active?: boolean;
  className?: string;
};

type NiulaiMarkProps = AccessibleArtwork & {
  size?: "sm" | "md";
  surface?: NiulaiSurface;
  className?: string;
};

const mascotSizes: Record<NiulaiSize, string> = {
  sm: "h-20 w-24",
  md: "h-32 w-36",
  lg: "h-44 w-52",
};

const imageSizes: Record<NiulaiSize, string> = {
  sm: "96px",
  md: "144px",
  lg: "208px",
};

const markSizes = { sm: "size-5", md: "size-7" } as const;
const subscribeToHydration = () => () => undefined;

export const niulaiPoseSources: Record<NiulaiPose, string> = {
  neutral: "/media/niulai-v1/poses/niulai-v1-pose-neutral.png",
  listening: "/media/niulai-v1/poses/niulai-v1-pose-listening.png",
  checking: "/media/niulai-v1/poses/niulai-v1-pose-checking.png",
  explaining: "/media/niulai-v1/poses/niulai-v1-pose-explaining.png",
  attentive: "/media/niulai-v1/poses/niulai-v1-pose-attentive.png",
  "safe-stop": "/media/niulai-v1/poses/niulai-v1-pose-safe-stop.png",
  ready: "/media/niulai-v1/poses/niulai-v1-pose-ready.png",
};

function artworkA11y(decorative: boolean | undefined, label: string | undefined) {
  return decorative === false
    ? { role: "img" as const, "aria-label": label }
    : { "aria-hidden": true as const };
}

function expressionFor(pose: NiulaiPose) {
  if (pose === "safe-stop") return "concerned";
  if (pose === "checking" || pose === "attentive") return "focused";
  if (pose === "ready") return "settled";
  if (pose === "explaining") return "speaking";
  if (pose === "listening") return "curious";
  return "deadpan";
}

export function NiulaiMark({ size = "sm", surface = "light", decorative = true, label, className = "" }: NiulaiMarkProps) {
  const monochrome = surface === "lime";
  const fur = monochrome ? "var(--niulai-mark-on-lime)" : "var(--niulai-fur)";
  const horn = monochrome ? "var(--niulai-mark-on-lime)" : surface === "dark" ? "var(--niulai-horn-on-dark)" : "var(--niulai-horn)";
  const feature = monochrome ? "var(--niulai-fur)" : "var(--niulai-feature)";
  const muzzle = monochrome ? "var(--niulai-fur)" : "var(--niulai-muzzle)";

  return (
    <svg viewBox="0 0 64 64" className={`${markSizes[size]} shrink-0 ${className}`} data-niulai-mark="true" data-niulai-surface={surface} focusable="false" {...artworkA11y(decorative, label)}>
      <path data-niulai-region="horn" d="M19 18C12 13 11 6 14 2c7 4 11 9 12 16ZM45 18c7-5 8-12 5-16-7 4-11 9-12 16Z" fill={horn} />
      <path data-niulai-region="ear" d="M18 23 5 18c1 9 6 13 15 12ZM46 23l13-5c-1 9-6 13-15 12Z" fill={fur} stroke={horn} strokeWidth="2" strokeLinejoin="round" />
      <path data-niulai-region="fur" d="M15 23c2-9 9-14 17-14s15 5 17 14l2 19c1 10-7 18-19 18s-20-8-19-18Z" fill={fur} stroke={horn} strokeWidth="2.5" strokeLinejoin="round" />
      <path data-niulai-region="brow" d="m18 29 10-2M36 27l10 2" fill="none" stroke={feature} strokeWidth="3.5" strokeLinecap="round" />
      <path data-niulai-region="eye" d="M19 32h9M36 32h9" fill="none" stroke={feature} strokeWidth="3" strokeLinecap="round" />
      <path data-niulai-region="muzzle" d="M17 38c3-5 8-7 15-7s12 2 15 7c4 8-3 16-15 16s-19-8-15-16Z" fill={muzzle} stroke={horn} strokeWidth="2" />
      <path d="M24 43h16M25 48h14" fill="none" stroke={feature} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function NiulaiMascot({ pose, size = "md", form, surface = "light", active = false, decorative = true, label, className = "" }: NiulaiMascotProps) {
  const reduceMotion = useReducedMotion();
  const motionReady = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const allowMotion = motionReady && !reduceMotion;
  const artwork = form ?? (size === "sm" ? "compact" : "full");
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center ${artwork === "compact" ? "overflow-hidden" : "overflow-visible"} ${mascotSizes[size]} ${className}`}
      data-niulai-pose={pose}
      data-niulai-surface={surface}
      data-niulai-active={active ? "true" : "false"}
      data-niulai-artwork={artwork}
      data-niulai-expression={expressionFor(pose)}
      data-niulai-model="niulai-v1-pose-set"
      data-niulai-pose-source={niulaiPoseSources[pose]}
      {...artworkA11y(decorative, label)}
    >
      <motion.span
        className="absolute inset-0 block"
        data-niulai-artwork-layer="true"
        initial={false}
        animate={allowMotion ? { opacity: [0.84, 1], y: [3, 0] } : { opacity: 1, y: 0 }}
        transition={{ duration: allowMotion ? 0.22 : 0, ease: [0.16, 1, 0.3, 1] }}
        aria-hidden="true"
      >
        <span className={artwork === "compact" ? "absolute -inset-x-8 -top-2 -bottom-28" : "absolute inset-0"}>
          <Image
            src={niulaiPoseSources[pose]}
            alt=""
            fill
            sizes={imageSizes[size]}
            className="object-contain object-top"
            draggable={false}
            loading="eager"
            unoptimized
          />
        </span>
      </motion.span>
    </span>
  );
}
