"use client";

import { CheckCircle, Copy, HourglassHigh, Question, ShieldCheck, XCircle } from "@phosphor-icons/react";
import Decimal from "decimal.js";
import { motion, useReducedMotion } from "motion/react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { CouncilReview, CouncilRoleProgress, ScenarioResult, SettlementType } from "@/lib/contracts";
import { formatUsd, shortenAddress } from "@/lib/frontend/format";

// A pure display-labeling comparison, not a financial calculation: it only compares two
// already-deterministically-computed values to describe what the user would hold at that
// scenario's settlement price, never originating or recalculating a dollar amount.
function assetCompositionLabel(settlementType: SettlementType, strikeUsd: string, settlementPriceUsd: string): string {
  if (settlementType === "cash") return "You would hold: ETH plus a cash top-up";
  // Primary copy never names the raw settlement-token symbol; the technical symbol is available
  // in the expandable protocol details instead.
  return Number(settlementPriceUsd) < Number(strikeUsd) ? "You would hold: a USD-linked settlement asset instead of ETH" : "You would hold: your ETH, unchanged";
}

const steps = ["Define goal", "Live options", "Council review", "Confirm preview", "Demo ready"] as const;

export const workflowSteps = steps;

// The dashboard's secondary progress read-out. Same source of truth as StageShell's full tracker,
// but sized to sit above the workspace rather than to be the page.
export function StageProgress({ step, className = "" }: { step: number; className?: string }) {
  return (
    <div className={"flex flex-wrap items-center gap-x-3 gap-y-2 " + className}>
      <p className="text-xs font-semibold text-[color:var(--foreground-soft)]">
        <span className="tabular-nums">Step {step} of {steps.length}</span>
        <span aria-hidden="true"> · </span>
        <span className="text-[color:var(--foreground)]">{steps[step - 1]}</span>
      </p>
      <ol className="flex min-w-0 flex-1 items-center gap-1.5" aria-label="Goal protection progress">
        {steps.map((label, index) => {
          const number = index + 1;
          const current = number === step;
          const complete = number < step;
          return (
            <li
              key={label}
              aria-current={current ? "step" : undefined}
              className={"h-1.5 min-w-4 flex-1 rounded-full " + (complete ? "bg-[var(--accent)]" : current ? "bg-[var(--surface-strong)]" : "bg-[var(--surface-hover)]")}
            >
              <span className="sr-only">{label}{complete ? " (complete)" : current ? " (current)" : ""}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function StageShell({ step, title, eyebrow, children }: { step: number; title: string; eyebrow: string; children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  return (
    <div className="reading-shell py-6 sm:py-10 lg:py-12">
      <div className="mb-8 rounded-[var(--radius-card)] bg-[var(--surface-subtle)] px-4 py-3">
        <StageProgress step={step} />
      </div>
      <motion.section
        className="workflow-stage"
        key={step + "-" + title}
        initial={reducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
        transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
        aria-labelledby="stage-title"
      >
        <div className="sr-only"><p>{eyebrow}</p><h1 id="stage-title">{title}</h1></div>
        {children}
      </motion.section>
    </div>
  );
}

export function MetricCard({ label, value, hint, tone = "default" }: { label: string; value: ReactNode; hint?: string; tone?: "default" | "accent" | "dark" | "lime" | "cyan" }) {
  const dark = tone === "dark";
  const accent = tone === "accent" || tone === "lime" || tone === "cyan";
  const stateClass = dark
    ? "bg-[var(--surface-dark)] text-[color:var(--text-on-dark)]"
    : accent
      ? "bg-[var(--accent)] text-[color:var(--accent-foreground)]"
      : "bg-[var(--surface-muted)] text-[color:var(--foreground)]";
  const supportingClass = dark
    ? "text-[color:var(--text-on-dark-muted)]"
    : accent
      ? "text-[color:var(--accent-foreground)]"
      : "text-[color:var(--foreground-soft)]";
  return (
    <div className={"rounded-[var(--radius-card)] p-5 " + stateClass}>
      <p className={"text-xs font-semibold uppercase tracking-[0.1em] " + supportingClass}>{label}</p>
      <div className="mt-3 text-xl font-semibold tracking-[-0.035em] tabular-nums">{value}</div>
      {hint ? <p className={"mt-2 text-sm leading-5 " + supportingClass}>{hint}</p> : null}
    </div>
  );
}

// Derives the ETH price move a scenario represents purely from already-returned settlement
// prices (down/up are fixed moves off the flat/current price -- see scenario() in
// src/lib/thetanuts/strategy.ts) -- arithmetic on real numbers, not an invented label.
function scenarioMoveLabel(scenarios: ScenarioResult[], key: ScenarioResult["key"]) {
  if (key === "custom") return null;
  if (key === "flat") return "0%";
  const flat = scenarios.find((item) => item.key === "flat");
  const current = scenarios.find((item) => item.key === key);
  if (!flat || !current) return null;
  const movePct = new Decimal(current.settlementPriceUsd).div(flat.settlementPriceUsd).minus(1).times(100).toDecimalPlaces(0);
  return `${movePct.isPositive() ? "+" : ""}${movePct.toString()}%`;
}

export function ScenarioComparison({ scenarios, settlementType, strikeUsd }: { scenarios: ScenarioResult[]; settlementType: SettlementType; strikeUsd: string }) {
  const reducedMotion = useReducedMotion();
  const values = scenarios.map((scenario) => Number(scenario.netProtectedValueUsd));
  const max = Math.max(...values, 1);
  const labels = { down: "Market down", flat: "Market flat", up: "Market up", custom: "Custom" } as const;
  return (
    <div className="min-w-0" role="list" aria-label="Estimated value after protection by market scenario">
      <div className="space-y-5">
        {scenarios.map((scenario) => {
          const moveLabel = scenarioMoveLabel(scenarios, scenario.key);
          return (
          <div key={scenario.key} role="listitem" className="scenario-row grid min-w-0 gap-2">
            <span className="text-sm text-[color:var(--foreground-soft)]">{labels[scenario.key]}{moveLabel ? ` (ETH ${moveLabel})` : ""}</span>
            <div className="h-3 overflow-hidden rounded-full bg-[var(--scenario-track)]" aria-hidden="true"><motion.div className="h-full min-w-1 origin-left rounded-full bg-[var(--accent)]" initial={reducedMotion ? false : { scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: reducedMotion ? 0 : 0.42, ease: [0.16, 1, 0.3, 1] }} style={{ width: Math.max(4, Math.min(100, (Number(scenario.netProtectedValueUsd) / max) * 100)) + "%" }} /></div>
            <span className="text-left text-sm font-semibold tabular-nums scenario-value">{formatUsd(scenario.netProtectedValueUsd)}</span>
            <span className="text-xs text-[color:var(--foreground-soft)]">{assetCompositionLabel(settlementType, strikeUsd, scenario.settlementPriceUsd)}</span>
            <span className="sr-only">Settlement price {formatUsd(scenario.settlementPriceUsd)}. Net protected value {formatUsd(scenario.netProtectedValueUsd)}.</span>
          </div>
          );
        })}
      </div>
    </div>
  );
}

export function CouncilCard({ review, label }: { review: CouncilReview; label: string }) {
  const [copied, setCopied] = useState(false);
  const statusColor = review.verdict === "approve" ? "var(--positive)" : review.verdict === "uncertain" ? "var(--accent)" : "var(--negative)";
  const VerdictIcon = review.verdict === "approve" ? CheckCircle : review.verdict === "uncertain" ? Question : XCircle;
  return (
    <article className="min-w-0 rounded-[var(--radius-card)] border-l-4 bg-[var(--surface-subtle)] p-5 sm:p-6" style={{ borderColor: statusColor }}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.12em]">{review.verdict}</p><h3 className="mt-1 text-2xl font-semibold tracking-[-0.04em]">{label}</h3></div>
        <VerdictIcon className="size-6" style={{ color: statusColor }} weight={review.verdict === "approve" ? "fill" : "regular"} aria-hidden="true" />
      </div>
      <p className="mt-4 text-sm leading-6 text-[color:var(--foreground-soft)]">{review.summary}</p>
      {review.concerns.length ? <div className="mt-4"><p className="text-xs font-semibold">Concerns</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[color:var(--foreground-soft)]">{review.concerns.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
      <div className="mt-5 border-t border-[var(--border)] pt-4">
        <p className="text-xs text-[color:var(--foreground-soft)]">Model · {review.model}</p>
        <div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 truncate text-xs tabular-nums">{review.requestId}</code><Button variant="ghost" className="px-3" aria-label={"Copy " + label + " Gonka request ID"} onClick={async () => { await navigator.clipboard.writeText(review.requestId); setCopied(true); window.setTimeout(() => setCopied(false), 1500); }}><Copy aria-hidden="true" />{copied ? "Copied" : "Copy"}</Button></div>
      </div>
      {review.requiredDisclosures.length ? <ul className="mt-4 space-y-1 text-xs leading-5 text-[color:var(--foreground-soft)]">{review.requiredDisclosures.map((item) => <li key={item}>Disclosure: {item}</li>)}</ul> : null}
    </article>
  );
}

// A truthful, real-time view of one council role while reviewCandidate() may still be running.
// Unlike CouncilCard (which requires a fully-formed CouncilReview), this renders "waiting" and
// "running" states backed only by real signals -- an actual gonka_inferences row's presence/
// absence and a real elapsed-second count -- never an invented completion percentage.
export function CouncilRoleProgressCard({ progress, label, elapsedSeconds, compact = false }: { progress: CouncilRoleProgress; label: string; elapsedSeconds: number | null; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  // A model summary runs to several hundred characters, which is fine across a full-width grid
  // but makes a fixed-width rail unusably tall. The full text stays available in the drawer.
  const summaryClamp = compact ? " line-clamp-4" : "";
  if (progress.status === "waiting") {
    return (
      <article className="min-w-0 rounded-[var(--radius-card)] border-l-4 border-[var(--border)] bg-[var(--surface-subtle)] p-5 opacity-60 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">Waiting</p><h3 className="mt-1 text-2xl font-semibold tracking-[-0.04em]">{label}</h3></div>
          <HourglassHigh className="size-6 text-[color:var(--foreground-soft)]" aria-hidden="true" />
        </div>
        <p className="mt-4 text-sm leading-6 text-[color:var(--foreground-soft)]">Not started yet -- runs after the role ahead of it.</p>
      </article>
    );
  }
  if (progress.status === "running") {
    return (
      <article className="min-w-0 rounded-[var(--radius-card)] border-l-4 bg-[var(--surface-subtle)] p-5 sm:p-6" style={{ borderColor: "var(--accent)" }}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.12em]">Running</p><h3 className="mt-1 text-2xl font-semibold tracking-[-0.04em]">{label}</h3></div>
          <HourglassHigh className="size-6 animate-pulse motion-reduce:animate-none" style={{ color: "var(--accent)" }} aria-hidden="true" />
        </div>
        <p className="mt-4 text-sm leading-6 text-[color:var(--foreground-soft)]" role="status" aria-live="polite">Live request to Gonka in progress{elapsedSeconds !== null ? ` — ${elapsedSeconds}s so far` : ""}.</p>
      </article>
    );
  }
  if (progress.status === "failed") {
    return (
      <article className="min-w-0 rounded-[var(--radius-card)] border-l-4 bg-[var(--surface-subtle)] p-5 sm:p-6" style={{ borderColor: "var(--negative)" }}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.12em]">Failed</p><h3 className="mt-1 text-2xl font-semibold tracking-[-0.04em]">{label}</h3></div>
          <XCircle className="size-6" style={{ color: "var(--negative)" }} aria-hidden="true" />
        </div>
        <p className="mt-4 text-sm leading-6 text-[color:var(--foreground-soft)]">{progress.errorMessage ?? "This role's request did not complete."}</p>
      </article>
    );
  }
  const statusColor = progress.verdict === "approve" ? "var(--positive)" : progress.verdict === "uncertain" ? "var(--accent)" : "var(--negative)";
  const VerdictIcon = progress.verdict === "approve" ? CheckCircle : progress.verdict === "uncertain" ? Question : XCircle;
  return (
    <article className="min-w-0 rounded-[var(--radius-card)] border-l-4 bg-[var(--surface-subtle)] p-5 sm:p-6" style={{ borderColor: statusColor }}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.12em]">{progress.verdict ?? "done"}</p><h3 className="mt-1 text-2xl font-semibold tracking-[-0.04em]">{label}</h3></div>
        <VerdictIcon className="size-6" style={{ color: statusColor }} weight={progress.verdict === "approve" ? "fill" : "regular"} aria-hidden="true" />
      </div>
      {progress.summary ? <p className={"mt-4 text-sm leading-6 text-[color:var(--foreground-soft)]" + summaryClamp}>{progress.summary}</p> : null}
      <div className="mt-5 border-t border-[var(--border)] pt-4">
        <p className="text-xs text-[color:var(--foreground-soft)]">Model · {progress.model}{progress.latencyMs !== null ? ` · completed in ${(progress.latencyMs / 1000).toFixed(1)}s` : ""}</p>
        {progress.requestId ? (
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate text-xs tabular-nums">{progress.requestId}</code>
            <Button variant="ghost" className="px-3" aria-label={"Copy " + label + " Gonka request ID"} onClick={async () => { await navigator.clipboard.writeText(progress.requestId!); setCopied(true); window.setTimeout(() => setCopied(false), 1500); }}>
              <Copy aria-hidden="true" />{copied ? "Copied" : "Copy"}
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function UnsignedTransactionCard({ title, to, data, value, chainId }: { title: string; to: string; data: string; value: string; chainId: number }) {
  const [copied, setCopied] = useState<string | null>(null);
  async function copy(valueToCopy: string, key: string) { await navigator.clipboard.writeText(valueToCopy); setCopied(key); window.setTimeout(() => setCopied(null), 1500); }
  return (
    <article className="rounded-[var(--radius-card)] border border-[var(--dark-border)] bg-[var(--finance-card-bg)] p-5 text-[color:var(--finance-card-fg)] sm:p-6">
      <div className="flex items-center gap-3"><ShieldCheck className="size-6" aria-hidden="true" /><div><p className="text-xs uppercase tracking-[0.1em] text-[color:var(--finance-card-muted)]">Unsigned transaction</p><h3 className="font-semibold">{title}</h3></div></div>
      <dl className="mt-5 grid min-w-0 gap-4 text-sm sm:grid-cols-2">
        <div className="sm:col-span-2"><dt className="text-xs text-[color:var(--finance-card-muted)]">Target</dt><dd className="mt-1 flex items-center gap-2"><code className="overflow-anywhere tabular-nums">{shortenAddress(to)}</code><button className="grid size-11 place-items-center rounded-full hover:bg-[var(--surface-dark-raised)]" aria-label="Copy transaction target" onClick={() => void copy(to, "to")}><Copy aria-hidden="true" /></button><span className="sr-only" aria-live="polite">{copied === "to" ? "Target copied" : ""}</span></dd></div>
        <div><dt className="text-xs text-[color:var(--finance-card-muted)]">Base chain ID</dt><dd className="mt-1 tabular-nums">{chainId}</dd></div>
        <div><dt className="text-xs text-[color:var(--finance-card-muted)]">Value</dt><dd className="mt-1 tabular-nums">{value} wei</dd></div>
      </dl>
      <details className="group mt-4 border-t border-[var(--dark-border)] pt-3">
        <summary className="flex min-h-11 list-none items-center justify-between gap-3 text-sm font-semibold">Inspect calldata <span className="text-xs font-normal text-[color:var(--finance-card-muted)] group-open:hidden">Hidden for readability</span><span className="hidden text-xs font-normal text-[color:var(--finance-card-muted)] group-open:inline">Collapse</span></summary>
        <div className="mt-2 flex min-w-0 items-center gap-2"><code className="overflow-anywhere min-w-0 flex-1 text-xs text-[color:var(--finance-card-muted)] tabular-nums">{data}</code><button className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-[var(--surface-dark-raised)]" aria-label="Copy transaction calldata" onClick={() => void copy(data, "data")}><Copy aria-hidden="true" /></button><span className="sr-only" aria-live="polite">{copied === "data" ? "Calldata copied" : ""}</span></div>
      </details>
    </article>
  );
}
