"use client";

import { ArrowUp, CheckCircle, Question, SpinnerGap, Warning } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  NiulaiChatRail,
  resolveNiulaiChatState,
  useNiulaiTypingActivity,
  type NiulaiChatState,
  type NiulaiMotionPreference,
  type NiulaiProcessingStage,
} from "@/components/brand/niulai-chat-rail";
import { Button } from "@/components/ui/button";

const processingStages: ReadonlyArray<{ stage: NiulaiProcessingStage; label: string }> = [
  { stage: "reading-goal", label: "Reading your goal" },
  { stage: "checking-options", label: "Checking live protection options" },
  { stage: "council-review", label: "GoalGuard reviewing" },
];

const integrationExample = `<NiulaiChatRail
  state={chatState}
  processingStage={processingStage}
  typingCadenceMs={typingCadenceMs}
/>`;

export function NiulaiChatPreview() {
  const [message, setMessage] = useState("");
  const [focused, setFocused] = useState(false);
  const [processingStage, setProcessingStage] = useState<NiulaiProcessingStage | undefined>();
  const [manualState, setManualState] = useState<"clarifying" | "ready" | "error" | null>(null);
  const [motionPreference, setMotionPreference] = useState<NiulaiMotionPreference>("system");
  const timers = useRef<number[]>([]);
  const { typing, typingCadenceMs, noteInputActivity, stopTyping } = useNiulaiTypingActivity();

  const state = resolveNiulaiChatState({
    hasError: manualState === "error",
    ready: manualState === "ready",
    clarifying: manualState === "clarifying",
    processing: Boolean(processingStage),
    typing,
    focused,
  });

  const clearProcessingTimers = () => {
    for (const timer of timers.current) window.clearTimeout(timer);
    timers.current = [];
  };

  useEffect(() => clearProcessingTimers, []);

  const status = useMemo(() => {
    if (state === "processing") return processingStages.find((item) => item.stage === processingStage)?.label ?? "Working";
    if (state === "typing") return "Niu Lai is matching your typing pace";
    if (state === "listening") return "Niu Lai is listening";
    if (state === "clarifying") return "One more detail is needed";
    if (state === "ready") return "Preview ready to inspect";
    if (state === "error") return "Stopped safely";
    return "Ready when you are";
  }, [processingStage, state]);

  function startProcessing() {
    if (!message.trim()) return;
    clearProcessingTimers();
    stopTyping();
    setFocused(false);
    setManualState(null);
    setProcessingStage("reading-goal");
    timers.current = [
      window.setTimeout(() => setProcessingStage("checking-options"), 1400),
      window.setTimeout(() => setProcessingStage("council-review"), 2800),
      window.setTimeout(() => { setProcessingStage(undefined); setManualState("ready"); }, 4300),
    ];
  }

  function selectState(next: Exclude<NiulaiChatState, "typing" | "processing" | "listening">) {
    clearProcessingTimers();
    setProcessingStage(undefined);
    setManualState(next === "idle" ? null : next);
    if (next === "idle") setFocused(false);
  }

  return (
    <section aria-labelledby="niulai-chat-preview-heading" className="overflow-hidden rounded-[var(--radius-feature)] border border-[var(--border)] bg-[var(--surface-raised)] shadow-[var(--shadow-float)]">
      <div className="grid gap-8 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] lg:p-9">
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="section-eyebrow text-[color:var(--foreground-muted)]">Standalone interaction lab</p>
              <h2 id="niulai-chat-preview-heading" className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">Niu Lai chat rail</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--foreground-soft)]">Type to trigger the 67 gesture, then send the sample message to see the Scuba processing loop.</p>
            </div>
            <label className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-xs font-semibold">
              <input
                type="checkbox"
                checked={motionPreference === "reduce"}
                onChange={(event) => setMotionPreference(event.target.checked ? "reduce" : "system")}
                className="size-4 accent-[var(--accent)]"
              />
              Reduce motion preview
            </label>
          </div>

          <div className="mt-7 rounded-[var(--radius-card)] bg-[var(--surface-strong)] p-3 text-[color:var(--foreground-on-strong)] sm:p-4">
            <div className="rounded-[calc(var(--radius-card)-0.5rem)] border border-[var(--border-on-strong)] bg-[var(--surface-strong-raised)] px-2 pt-1 sm:px-3">
              <NiulaiChatRail state={state} processingStage={processingStage} typingCadenceMs={typingCadenceMs} motionPreference={motionPreference} />
              <form
                className="relative border-t border-[var(--border-on-strong)] pb-3 pt-3"
                onSubmit={(event) => { event.preventDefault(); startProcessing(); }}
              >
                <label htmlFor="niulai-preview-message" className="sr-only">Mock chat message</label>
                <textarea
                  id="niulai-preview-message"
                  rows={3}
                  value={message}
                  disabled={Boolean(processingStage)}
                  onFocus={() => { setFocused(true); setManualState(null); }}
                  onBlur={() => { setFocused(false); stopTyping(); }}
                  onChange={(event) => { setMessage(event.target.value); setManualState(null); noteInputActivity(); }}
                  placeholder="I need to protect my rent money until next month…"
                  className="min-h-28 w-full resize-none rounded-[var(--radius-control)] border border-transparent bg-transparent px-3 py-2 pr-16 text-base leading-6 text-[color:var(--foreground-on-strong)] outline-none placeholder:text-[color:var(--foreground-on-strong-muted)] focus:border-[var(--accent)] disabled:opacity-60"
                />
                <Button type="submit" disabled={!message.trim() || Boolean(processingStage)} className="absolute bottom-5 right-2 size-11 min-h-11 px-0" aria-label="Run mock agent">
                  {processingStage ? <SpinnerGap className="size-5 animate-spin" aria-hidden="true" /> : <ArrowUp className="size-5" aria-hidden="true" />}
                </Button>
              </form>
            </div>
            <p className="mt-3 min-h-6 px-2 text-sm text-[color:var(--foreground-on-strong-muted)]" role="status" aria-live="polite">{status}</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2" aria-label="Mascot preview states">
            <Button variant="secondary" className="px-4" onClick={() => selectState("clarifying")}><Question aria-hidden="true" />Clarification</Button>
            <Button variant="secondary" className="px-4" onClick={() => selectState("ready")}><CheckCircle aria-hidden="true" />Ready</Button>
            <Button variant="secondary" className="px-4" onClick={() => selectState("error")}><Warning aria-hidden="true" />Error</Button>
            <Button variant="ghost" className="px-4" onClick={() => selectState("idle")}>Reset</Button>
          </div>
        </div>

        <aside className="min-w-0 rounded-[var(--radius-card)] bg-[var(--surface-subtle)] p-5">
          <p className="section-eyebrow text-[color:var(--foreground-muted)]">Drop-in API</p>
          <h3 className="mt-3 text-lg font-semibold tracking-[-0.025em]">Connect two explicit props</h3>
          <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">The future chatbot owns all status and API behavior. This component only renders the state it receives.</p>
          <pre className="overflow-anywhere mt-5 overflow-x-auto rounded-[var(--radius-control)] bg-[var(--surface-strong)] p-4 text-xs leading-6 text-[color:var(--foreground-on-strong)]"><code>{integrationExample}</code></pre>
          <div className="mt-5 w-full max-w-80 rounded-[var(--radius-control)] border border-dashed border-[var(--border-strong)] bg-[var(--surface-raised)] p-2">
            <p className="px-2 pb-1 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[color:var(--foreground-muted)]">320px container check</p>
            <NiulaiChatRail state={state} processingStage={processingStage} typingCadenceMs={typingCadenceMs} motionPreference={motionPreference} />
          </div>
        </aside>
      </div>
    </section>
  );
}
