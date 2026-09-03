"use client";

import { Check, CheckCircle, Copy, Question, ShieldCheck, XCircle } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { CouncilReview, ScenarioResult } from "@/lib/contracts";
import { formatUsd, shortenAddress } from "@/lib/frontend/format";

const steps = ["Define goal", "Live options", "Council review", "Confirm preview", "Demo ready"] as const;

export function StageShell({ step, title, eyebrow, children }: { step: number; title: string; eyebrow: string; children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  return (
    <div className="reading-shell py-6 sm:py-10 lg:py-12">
      <div className="mb-8 rounded-[var(--radius-card)] bg-[var(--surface-subtle)] p-3 sm:p-4">
        <div className="flex items-center justify-between gap-4 lg:hidden">
          <div><p className="text-xs font-bold uppercase tracking-[0.1em] text-[color:var(--foreground-muted)]">Step {step} of 5</p><p className="mt-1 font-semibold">{steps[step - 1]}</p></div>
          <span className="text-xs text-[color:var(--foreground-soft)]">{eyebrow}</span>
        </div>
        <ol className="hidden grid-cols-5 lg:grid" aria-label="Goal protection progress">
          {steps.map((label, index) => {
            const number = index + 1;
            const complete = number < step;
            const current = number === step;
            const stateClass = current ? "text-[color:var(--foreground)]" : "text-[color:var(--foreground-soft)]";
            const numberClass = current
              ? "border-[var(--black)] bg-[var(--black)] text-[color:var(--white)]"
              : complete
                ? "border-[var(--accent)] bg-[var(--accent)] text-[color:var(--black)]"
                : "border-[var(--border-strong)] bg-[var(--white)]";
            return (
              <li key={label} aria-current={current ? "step" : undefined} className={"relative flex min-h-12 items-center gap-3 rounded-xl px-3 " + stateClass}>
                <span className={"grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold tabular-nums " + numberClass}>{complete ? <Check className="size-4" aria-hidden="true" /> : number}</span>
                <span className={current ? "font-semibold" : ""}>{label}</span>
              </li>
            );
          })}
        </ol>
      </div>
      <motion.section
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
  return (
    <div className={"rounded-[var(--radius-card)] p-5 " + stateClass}>
      <p className={"text-xs font-semibold uppercase tracking-[0.1em] " + (dark ? "text-[color:var(--text-on-dark-muted)]" : "text-[color:var(--foreground-soft)]")}>{label}</p>
      <div className="mt-3 text-xl font-semibold tracking-[-0.035em] tabular-nums">{value}</div>
      {hint ? <p className={"mt-2 text-sm leading-5 " + (dark ? "text-[color:var(--text-on-dark-muted)]" : "text-[color:var(--foreground-soft)]")}>{hint}</p> : null}
    </div>
  );
}

export function ScenarioComparison({ scenarios }: { scenarios: ScenarioResult[] }) {
  const values = scenarios.map((scenario) => Number(scenario.netProtectedValueUsd));
  const max = Math.max(...values, 1);
  const labels = { down: "Market down", flat: "Market flat", up: "Market up", custom: "Custom" } as const;
  return (
    <div>
      <div className="space-y-5" aria-hidden="true">
        {scenarios.map((scenario) => (
          <div key={scenario.key} className="grid gap-2 sm:grid-cols-[7.5rem_1fr_7rem] sm:items-center">
            <span className="text-sm text-[color:var(--foreground-soft)]">{labels[scenario.key]}</span>
            <div className="h-3 overflow-hidden rounded-full bg-[var(--gray-200)]"><div className="h-full min-w-1 rounded-full bg-[var(--accent)]" style={{ width: Math.max(4, Math.min(100, (Number(scenario.netProtectedValueUsd) / max) * 100)) + "%" }} /></div>
            <span className="text-left text-sm font-semibold tabular-nums sm:text-right">{formatUsd(scenario.netProtectedValueUsd)}</span>
          </div>
        ))}
      </div>
      <table className="sr-only"><caption>Estimated value after protection by market scenario</caption><thead><tr><th>Scenario</th><th>Settlement price</th><th>Net protected value</th></tr></thead><tbody>{scenarios.map((scenario) => <tr key={scenario.key}><td>{labels[scenario.key]}</td><td>{formatUsd(scenario.settlementPriceUsd)}</td><td>{formatUsd(scenario.netProtectedValueUsd)}</td></tr>)}</tbody></table>
    </div>
  );
}

export function CouncilCard({ review, label }: { review: CouncilReview; label: string }) {
  const [copied, setCopied] = useState(false);
  const statusColor = review.verdict === "approve" ? "var(--positive)" : review.verdict === "uncertain" ? "var(--accent)" : "var(--negative)";
  const VerdictIcon = review.verdict === "approve" ? CheckCircle : review.verdict === "uncertain" ? Question : XCircle;
  return (
    <article className="rounded-[var(--radius-card)] border-l-4 bg-[var(--surface-subtle)] p-5 sm:p-6" style={{ borderColor: statusColor }}>
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.12em]">{review.verdict}</p><h3 className="mt-1 text-2xl font-semibold tracking-[-0.04em]">{label}</h3></div>
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

export function UnsignedTransactionCard({ title, to, data, value, chainId }: { title: string; to: string; data: string; value: string; chainId: number }) {
  const [copied, setCopied] = useState<string | null>(null);
  async function copy(valueToCopy: string, key: string) { await navigator.clipboard.writeText(valueToCopy); setCopied(key); window.setTimeout(() => setCopied(null), 1500); }
  return (
    <article className="rounded-[var(--radius-card)] border border-[var(--dark-border)] bg-[var(--finance-card-bg)] p-5 text-[color:var(--finance-card-fg)] sm:p-6">
      <div className="flex items-center gap-3"><ShieldCheck className="size-6" aria-hidden="true" /><div><p className="text-xs uppercase tracking-[0.1em] text-[color:var(--finance-card-muted)]">Unsigned transaction</p><h3 className="font-semibold">{title}</h3></div></div>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
        <div className="sm:col-span-2"><dt className="text-xs text-[color:var(--finance-card-muted)]">Target</dt><dd className="mt-1 flex items-center gap-2"><code className="overflow-anywhere tabular-nums">{shortenAddress(to)}</code><button className="grid size-11 place-items-center rounded-full hover:bg-[var(--surface-dark-raised)]" aria-label="Copy transaction target" onClick={() => void copy(to, "to")}><Copy aria-hidden="true" /></button><span className="sr-only" aria-live="polite">{copied === "to" ? "Target copied" : ""}</span></dd></div>
        <div><dt className="text-xs text-[color:var(--finance-card-muted)]">Base chain ID</dt><dd className="mt-1 tabular-nums">{chainId}</dd></div>
        <div><dt className="text-xs text-[color:var(--finance-card-muted)]">Value</dt><dd className="mt-1 tabular-nums">{value} wei</dd></div>
        <div className="sm:col-span-2"><dt className="text-xs text-[color:var(--finance-card-muted)]">Calldata</dt><dd className="mt-1 flex items-center gap-2"><code className="min-w-0 flex-1 truncate text-[color:var(--finance-card-muted)] tabular-nums">{data}</code><button className="grid size-11 place-items-center rounded-full hover:bg-[var(--surface-dark-raised)]" aria-label="Copy transaction calldata" onClick={() => void copy(data, "data")}><Copy aria-hidden="true" /></button><span className="sr-only" aria-live="polite">{copied === "data" ? "Calldata copied" : ""}</span></dd></div>
      </dl>
    </article>
  );
}
