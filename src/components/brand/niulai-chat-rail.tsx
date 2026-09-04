"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

import { NiulaiMascot, type NiulaiPose } from "@/components/brand/niulai-mascot";

export type NiulaiChatState = "idle" | "listening" | "typing" | "processing" | "clarifying" | "ready" | "error";
export type NiulaiProcessingStage = "reading-goal" | "checking-options" | "council-review";
export type NiulaiMotionPreference = "system" | "reduce";
export type NiulaiMotion = "gesture-67" | "scuba";

export interface NiulaiChatRailProps {
  state: NiulaiChatState;
  processingStage?: NiulaiProcessingStage;
  typingCadenceMs?: number;
  motionPreference?: NiulaiMotionPreference;
  className?: string;
}

export interface NiulaiChatSignals {
  hasError?: boolean;
  ready?: boolean;
  clarifying?: boolean;
  processing?: boolean;
  typing?: boolean;
  focused?: boolean;
}

export const NIULAI_TYPING_DEFAULT_CADENCE_MS = 200;
export const NIULAI_TYPING_STOP_MIN_MS = 160;
export const NIULAI_TYPING_STOP_MAX_MS = 600;
export const NIULAI_PROCESSING_DELAY_MS = 350;
export const niulaiGesture67SpriteSource = "/media/niulai-v1/motion/niulai-v1-motion-67-sprite.webp";

export const niulaiMotionSources: Record<NiulaiMotion, string> = {
  "gesture-67": "/media/niulai-v1/motion/niulai-v1-motion-67.webp",
  scuba: "/media/niulai-v1/motion/niulai-v1-motion-scuba.webp",
};

export const niulaiChatFallbackPoses: Record<NiulaiChatState, NiulaiPose> = {
  idle: "neutral",
  listening: "listening",
  typing: "listening",
  processing: "checking",
  clarifying: "explaining",
  ready: "ready",
  error: "safe-stop",
};

export function resolveNiulaiChatState(signals: NiulaiChatSignals): NiulaiChatState {
  if (signals.hasError) return "error";
  if (signals.ready) return "ready";
  if (signals.clarifying) return "clarifying";
  if (signals.processing) return "processing";
  if (signals.typing) return "typing";
  if (signals.focused) return "listening";
  return "idle";
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function resolveNiulaiGestureCycleMs(typingCadenceMs = NIULAI_TYPING_DEFAULT_CADENCE_MS) {
  return Math.round(clamp(typingCadenceMs * 4, 480, 1500));
}

export function useNiulaiTypingActivity() {
  const timer = useRef<number | null>(null);
  const lastActivityAt = useRef<number | null>(null);
  const cadence = useRef<number | null>(null);
  const [typing, setTyping] = useState(false);
  const [typingCadenceMs, setTypingCadenceMs] = useState(NIULAI_TYPING_DEFAULT_CADENCE_MS);

  const stopTyping = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    lastActivityAt.current = null;
    cadence.current = null;
    setTyping(false);
    setTypingCadenceMs(NIULAI_TYPING_DEFAULT_CADENCE_MS);
  }, []);

  const noteInputActivity = useCallback(() => {
    const now = Date.now();
    if (timer.current !== null) window.clearTimeout(timer.current);
    const interval = lastActivityAt.current === null ? null : now - lastActivityAt.current;
    if (interval !== null && interval >= 30 && interval <= 1200) {
      cadence.current = cadence.current === null
        ? interval
        : Math.round((cadence.current * 0.65) + (interval * 0.35));
      setTypingCadenceMs(cadence.current);
    }
    lastActivityAt.current = now;
    setTyping(true);
    const stopAfterMs = cadence.current === null
      ? NIULAI_TYPING_STOP_MAX_MS
      : clamp(cadence.current * 1.6, NIULAI_TYPING_STOP_MIN_MS, NIULAI_TYPING_STOP_MAX_MS);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      lastActivityAt.current = null;
      cadence.current = null;
      setTyping(false);
    }, stopAfterMs);
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  return { typing, typingCadenceMs, noteInputActivity, stopTyping } as const;
}

function ProcessingNiulaiChatRail(props: NiulaiChatRailProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), NIULAI_PROCESSING_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return <NiulaiChatRailVisual {...props} requestedMotion={ready ? "scuba" : null} />;
}

function useDocumentVisible() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const update = () => setVisible(document.visibilityState !== "hidden");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  return visible;
}

function wrapperAnimation(state: NiulaiChatState, activeMotion: NiulaiMotion | null, allowMotion: boolean) {
  if (!allowMotion) return { x: 0, y: 0, rotate: 0, scale: 1 };
  if (activeMotion === "gesture-67") return { x: [0, -2, 2, 0], y: [0, -1, 0], rotate: [0, -1, 1, 0], scale: 1 };
  if (activeMotion === "scuba") return { x: [-3, 3, -2, -3], y: [0, -2, 0], rotate: [-1, 1, -1], scale: 1 };
  if (state === "ready") return { x: 0, y: [2, -2, 0], rotate: 0, scale: [0.97, 1.04, 1] };
  if (state === "listening") return { x: 0, y: 0, rotate: [0, -1.5, 0], scale: 1 };
  return { x: 0, y: 0, rotate: 0, scale: 1 };
}

type NiulaiChatRailVisualProps = NiulaiChatRailProps & { requestedMotion: NiulaiMotion | null };

function NiulaiChatRailVisual({ state, processingStage, typingCadenceMs = NIULAI_TYPING_DEFAULT_CADENCE_MS, motionPreference = "system", className = "", requestedMotion }: NiulaiChatRailVisualProps) {
  const systemReducedMotion = useReducedMotion();
  const documentVisible = useDocumentVisible();
  const [failedMotions, setFailedMotions] = useState<ReadonlySet<NiulaiMotion>>(() => new Set());
  const reduceMotion = motionPreference === "reduce" || systemReducedMotion === true;
  const activeMotion = requestedMotion && !failedMotions.has(requestedMotion) && documentVisible && !reduceMotion ? requestedMotion : null;
  const fallbackPose = niulaiChatFallbackPoses[state];
  const repeating = activeMotion !== null;
  const gestureCycleMs = resolveNiulaiGestureCycleMs(typingCadenceMs);
  const preloadGesture = (state === "listening" || state === "typing") && !reduceMotion && !failedMotions.has("gesture-67");

  return (
    <div
      aria-hidden="true"
      className={`niulai-chat-rail pointer-events-none w-full ${className}`}
      data-niulai-chat-state={state}
      data-niulai-processing-stage={state === "processing" ? processingStage : undefined}
      data-niulai-motion-active={activeMotion ?? "none"}
      data-niulai-motion-requested={requestedMotion ?? "none"}
      data-niulai-media-failed={requestedMotion ? failedMotions.has(requestedMotion) : false}
      data-niulai-gesture-cycle-ms={state === "typing" ? gestureCycleMs : undefined}
    >
      <div className="niulai-chat-rail__stage relative isolate overflow-hidden">
        {preloadGesture ? (
          <Image
            src={niulaiGesture67SpriteSource}
            alt=""
            width={7200}
            height={600}
            unoptimized
            loading="eager"
            className="hidden"
            data-niulai-motion-preload="gesture-67"
            onError={() => setFailedMotions((current) => new Set(current).add("gesture-67"))}
          />
        ) : null}
        <span className="niulai-chat-rail__mascot absolute bottom-2 left-1/2 block -translate-x-1/2">
          <motion.span
            key={`${state}-${activeMotion ?? "static"}`}
            className="absolute inset-0 block"
            initial={false}
            animate={wrapperAnimation(state, activeMotion, !reduceMotion)}
            transition={repeating
              ? { duration: activeMotion === "gesture-67" ? gestureCycleMs / 1000 : 1.5, ease: "easeInOut", repeat: Infinity }
              : { duration: reduceMotion ? 0 : state === "ready" ? 0.42 : 0.22, ease: [0.16, 1, 0.3, 1] }}
            data-niulai-motion-wrapper="true"
          >
            {activeMotion === "gesture-67" ? (
              <span
                className="niulai-chat-rail__gesture-67 absolute inset-0"
                data-niulai-motion-asset="gesture-67"
                style={{ "--niulai-gesture-cycle": `${gestureCycleMs}ms` } as CSSProperties}
              />
            ) : activeMotion === "scuba" ? (
              <Image
                key={activeMotion}
                src={niulaiMotionSources[activeMotion]}
                alt=""
                width={480}
                height={600}
                unoptimized
                draggable={false}
                className="absolute inset-0 h-full w-full object-contain"
                data-niulai-motion-asset={activeMotion}
                onError={() => setFailedMotions((current) => new Set(current).add(activeMotion))}
              />
            ) : (
              <span className="absolute inset-0" data-niulai-static-fallback="true">
                <NiulaiMascot pose={fallbackPose} size="sm" form="full" className="h-full w-full" />
              </span>
            )}
          </motion.span>
        </span>
      </div>
    </div>
  );
}

export function NiulaiChatRail(props: NiulaiChatRailProps) {
  if (props.state === "processing") return <ProcessingNiulaiChatRail {...props} />;
  return <NiulaiChatRailVisual {...props} requestedMotion={props.state === "typing" ? "gesture-67" : null} />;
}
