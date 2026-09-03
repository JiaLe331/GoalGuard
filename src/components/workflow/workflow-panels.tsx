"use client";

import { ArrowLeft, ArrowRight, CheckCircle, Copy, HourglassHigh, PencilSimple, Receipt, ShieldCheck, Warning } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";

import { PipMascot, type PipPose } from "@/components/brand/pip-mascot";
import { Accordion } from "@/components/ui/accordion";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Field } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/status-badge";
import { CouncilCard, MetricCard, ScenarioComparison, UnsignedTransactionCard } from "@/components/workflow/workflow-primitives";
import { UpdateGoalRequestSchema, type ApiMeta, type CouncilDecision, type Goal, type GoalType, type JsonValue, type PublicProtectionCandidate, type Trade, type TradePreview, type UpdateGoalRequest } from "@/lib/contracts";
import { formatBaseUnits, formatCountdown, formatDate, formatDateInput, formatDateTime, formatPercentFromBps, formatUsd, localCalendarDayEndUtc, localCalendarDayStartUtc, secondsUntil, shortenAddress } from "@/lib/frontend/format";
import type { WorkflowError } from "@/lib/frontend/workflow";

const goalLabels: Record<GoalType, string> = {
  rent: "Rent",
  tuition: "Tuition",
  travel: "Travel",
  emergency: "Emergency fund",
  custom: "Custom goal",
};

const roleLabels = {
  strategist: "Strategist",
  risk_auditor: "Risk Auditor",
  consumer_advocate: "Consumer Advocate",
} as const;

function goalName(goal: Goal) {
  return goal.customGoalLabel ?? goalLabels[goal.goalType];
}

function firstError(errors: Record<string, string[]>, key: string) {
  return errors[key]?.[0];
}

export function GoalConfirmationForm({ goal, busy, fieldErrors, onSave, onFind }: {
  goal: Goal;
  busy: boolean;
  fieldErrors: Record<string, string[]>;
  onSave: (value: UpdateGoalRequest) => void;
  onFind: (value: UpdateGoalRequest) => void;
}) {
  const [values, setValues] = useState({
    goalType: goal.goalType,
    customGoalLabel: goal.customGoalLabel ?? "",
    protectedValueUsd: goal.protectedValueUsd,
    protectThroughDate: formatDateInput(goal.protectThroughAt, goal.timezone),
    fundsNeededDate: formatDateInput(goal.fundsNeededAt, goal.timezone),
    maxLossPercent: String(goal.maxLossBps / 100),
    maxPremiumUsd: goal.maxPremiumUsd ?? "",
  });
  const [localErrors, setLocalErrors] = useState<Record<string, string[]>>({});
  const errors = { ...fieldErrors, ...localErrors };
  const errorEntries = Object.entries(errors).filter(([, messages]) => messages?.length);

  function update(key: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setLocalErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function parse(): UpdateGoalRequest | null {
    const immediate: Record<string, string[]> = {};
    if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(values.protectedValueUsd.trim()) || Number(values.protectedValueUsd) <= 0) immediate.protectedValueUsd = ["Enter an amount greater than zero."];
    if (!Number.isFinite(Number(values.maxLossPercent)) || Number(values.maxLossPercent) < 0 || Number(values.maxLossPercent) >= 100) {
      immediate.maxLossBps = ["Enter a loss limit from 0 to 99.99%."];
    }
    if (values.maxPremiumUsd.trim() && Number(values.maxPremiumUsd) <= 0) {
      immediate.maxPremiumUsd = ["Enter a protection cost greater than zero, or leave it blank."];
    }
    const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
    if (!validDate(values.protectThroughDate)) immediate.protectThroughAt = ["Choose a valid protection cutoff date."];
    if (!validDate(values.fundsNeededDate)) immediate.fundsNeededAt = ["Choose a valid funds-needed date."];
    let protectThroughAt = "";
    let fundsNeededAt = "";
    if (validDate(values.protectThroughDate) && validDate(values.fundsNeededDate)) {
      protectThroughAt = localCalendarDayEndUtc(values.protectThroughDate, goal.timezone);
      fundsNeededAt = localCalendarDayStartUtc(values.fundsNeededDate, goal.timezone);
      if (Date.parse(protectThroughAt) >= Date.parse(fundsNeededAt)) {
        immediate.protectThroughAt = ["The protection cutoff must be before the funds-needed cutoff."];
        immediate.fundsNeededAt = ["Choose a later funds-needed cutoff or an earlier protection cutoff."];
      }
    }
    if (Object.keys(immediate).length) {
      setLocalErrors(immediate);
      window.setTimeout(() => document.getElementById("goal-error-summary")?.focus(), 0);
      return null;
    }

    const parsed = UpdateGoalRequestSchema.safeParse({
      goalType: values.goalType,
      customGoalLabel: values.goalType === "custom" ? values.customGoalLabel.trim() || null : null,
      underlyingAsset: "ETH" as const,
      protectedValueUsd: values.protectedValueUsd.trim(),
      protectThroughAt,
      fundsNeededAt,
      timezone: goal.timezone,
      timingConfirmed: true as const,
      maxLossBps: Math.round(Number(values.maxLossPercent) * 100),
      maxPremiumUsd: values.maxPremiumUsd.trim() || null,
    });
    if (parsed.success) return parsed.data;

    const next: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      (next[key] ??= []).push(issue.message);
    }
    setLocalErrors(next);
    window.setTimeout(() => document.getElementById("goal-error-summary")?.focus(), 0);
    return null;
  }

  function submit(kind: "save" | "find") {
    const parsed = parse();
    if (!parsed) return;
    if (kind === "save") onSave(parsed);
    else onFind(parsed);
  }

  const describedBy = (key: string) => firstError(errors, key) ? key + "-description" : undefined;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <Card className="p-5 sm:p-8 lg:p-10">
        <div className="max-w-2xl">
          <p className="section-eyebrow text-[color:var(--foreground-muted)]">Define the guardrail</p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-5xl">Make the goal exact.</h1>
          <p className="mt-4 max-w-xl text-[color:var(--foreground-soft)]">Confirm the amount, two timing cutoffs, and acceptable downside before GoalGuard checks a live option.</p>
        </div>

        {errorEntries.length ? (
          <div id="goal-error-summary" tabIndex={-1} role="alert" className="mt-6 rounded-[var(--radius-control)] border border-[var(--negative)] bg-[var(--negative-surface)] p-4 outline-none focus:ring-2 focus:ring-[var(--negative)]">
            <p className="font-semibold">Fix {errorEntries.length} field{errorEntries.length === 1 ? "" : "s"} to continue</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[color:var(--foreground-soft)]">
              {errorEntries.map(([key, messages]) => <li key={key}><a href={"#" + key} className="underline underline-offset-4">{messages[0]}</a></li>)}
            </ul>
          </div>
        ) : null}

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <Field label="Goal purpose" htmlFor="goalType" error={firstError(errors, "goalType")}>
            <select id="goalType" className="field-control" value={values.goalType} onChange={(event) => update("goalType", event.target.value)} aria-describedby={describedBy("goalType")}>
              {Object.entries(goalLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          {values.goalType === "custom" ? (
            <Field label="Goal name" htmlFor="customGoalLabel" error={firstError(errors, "customGoalLabel")}>
              <input id="customGoalLabel" className="field-control" value={values.customGoalLabel} onChange={(event) => update("customGoalLabel", event.target.value)} aria-describedby={describedBy("customGoalLabel")} />
            </Field>
          ) : (
            <Field label="Asset" htmlFor="underlyingAsset" hint="P0 supports ETH goals on Base.">
              <input id="underlyingAsset" className="field-control" value="ETH" disabled aria-describedby="underlyingAsset-description" />
            </Field>
          )}
          <Field label="Amount you need to preserve (USD)" htmlFor="protectedValueUsd" error={firstError(errors, "protectedValueUsd")}>
            <input id="protectedValueUsd" inputMode="decimal" className="field-control" value={values.protectedValueUsd} onChange={(event) => update("protectedValueUsd", event.target.value)} aria-invalid={Boolean(firstError(errors, "protectedValueUsd"))} aria-describedby={describedBy("protectedValueUsd")} />
          </Field>
          <Field label="Protect against an ETH fall through" htmlFor="protectThroughDate" hint={`Resolves to the end of this day in ${goal.timezone}.`} error={firstError(errors, "protectThroughAt")}>
            <input id="protectThroughDate" type="date" className="field-control" value={values.protectThroughDate} onChange={(event) => update("protectThroughDate", event.target.value)} aria-invalid={Boolean(firstError(errors, "protectThroughAt"))} aria-describedby={describedBy("protectThroughAt")} />
          </Field>
          <Field label="Funds must be available by" htmlFor="fundsNeededDate" hint={`Resolves to the start of this day in ${goal.timezone}.`} error={firstError(errors, "fundsNeededAt")}>
            <input id="fundsNeededDate" type="date" className="field-control" value={values.fundsNeededDate} onChange={(event) => update("fundsNeededDate", event.target.value)} aria-invalid={Boolean(firstError(errors, "fundsNeededAt"))} aria-describedby={describedBy("fundsNeededAt")} />
          </Field>
          <Field label="Maximum acceptable loss (%)" htmlFor="maxLossBps" error={firstError(errors, "maxLossBps")}>
            <input id="maxLossBps" inputMode="decimal" className="field-control" value={values.maxLossPercent} onChange={(event) => update("maxLossPercent", event.target.value)} aria-invalid={Boolean(firstError(errors, "maxLossBps"))} aria-describedby={describedBy("maxLossBps")} />
          </Field>
          <Field label="Maximum protection cost (USD, optional)" htmlFor="maxPremiumUsd" error={firstError(errors, "maxPremiumUsd")}>
            <input id="maxPremiumUsd" inputMode="decimal" className="field-control" value={values.maxPremiumUsd} onChange={(event) => update("maxPremiumUsd", event.target.value)} aria-invalid={Boolean(firstError(errors, "maxPremiumUsd"))} aria-describedby={describedBy("maxPremiumUsd")} />
          </Field>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" onClick={() => submit("save")} disabled={busy}><PencilSimple aria-hidden="true" />Save changes</Button>
          <Button onClick={() => submit("find")} disabled={busy}>{busy ? "Checking live protection…" : "Find live protection"}<ArrowRight aria-hidden="true" /></Button>
        </div>
      </Card>
      <aside className="space-y-3">
        <Card tone="white" className="flex items-center gap-3 p-4">
          <PipMascot pose="listening" size="sm" />
          <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">Set the purpose, amount, and limits at your pace. Nothing moves while you edit.</p>
        </Card>
        <MetricCard label="Purpose" value={goalName(goal)} tone="accent" />
        <MetricCard label="Asset" value="ETH on Base" hint="One supported network keeps the preview easy to verify." />
        <MetricCard label="Confirmed time zone" value={goal.timezone} hint="These calendar dates resolve to explicit UTC cutoffs before saving." />
        <Alert tone="error" title="Settlement timing not verified">Expiry protection is not proof that Base USDC will be available by the payment time. GoalGuard does not assume an early sale.</Alert>
      </aside>
    </div>
  );
}

export function ActiveProtectionPanel({ stage }: { stage: "searching_candidates" | "reviewing_candidate" | "generating_preview" }) {
  const content = stage === "searching_candidates"
    ? ["Checking live protection", "GoalGuard is reading active ETH put options from Thetanuts and applying your exact limits."]
    : stage === "reviewing_candidate"
      ? ["Three independent checks", "The Gonka council is reviewing fit, downside risk, and clarity. Deterministic values cannot be changed by the reviewers."]
      : ["Generating unsigned preview", "GoalGuard is revalidating the approved option, wallet readiness, allowance, and exact Base calldata."];
  const pipPose: PipPose = stage === "searching_candidates" ? "checking" : stage === "reviewing_candidate" ? "explaining" : "attentive";

  return (
    <div className="relative isolate mx-auto grid min-h-[34rem] max-w-5xl overflow-hidden rounded-[var(--radius-section)] bg-[var(--surface-dark)] text-[color:var(--text-on-dark)] lg:grid-cols-[1fr_20rem]">
      <div className="absolute -bottom-44 -left-32 size-[30rem] rounded-full border-[5rem] border-[var(--accent)] opacity-15" aria-hidden="true" />
      <div className="relative flex flex-col justify-center p-7 sm:p-12 lg:p-16">
        <div><StatusBadge tone="info" label="Live request active" /></div>
        <h1 className="mt-7 max-w-2xl text-5xl font-semibold leading-[0.98] tracking-[-0.05em] sm:text-6xl">{content[0]}</h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-[color:var(--text-on-dark-muted)]">{content[1]}</p>
        <div className="mt-9 flex items-center gap-3 text-sm" role="status"><HourglassHigh className="size-5 animate-pulse motion-reduce:animate-none" aria-hidden="true" />Waiting for a truthful backend result—no simulated percentage.</div>
      </div>
      <div className="relative border-t border-[var(--dark-border)] lg:border-l lg:border-t-0">
        <div className="grid place-items-center px-7 pt-6 lg:px-8 lg:pt-8"><div className="grid size-40 place-items-center rounded-full bg-[var(--white)]"><PipMascot pose={pipPose} surface="light" active size="md" /></div></div>
        <ol className="p-7 pt-2 text-sm text-[color:var(--foreground-on-strong-muted)] lg:p-8 lg:pt-2" aria-label="Live request provenance">
          <li className="border-t border-[var(--dark-border)] py-4">01 · Read authoritative inputs</li>
          <li className="border-t border-[var(--dark-border)] py-4">02 · Apply deterministic checks</li>
          <li className="border-y border-[var(--dark-border)] py-4">03 · Return an auditable result</li>
        </ol>
      </div>
    </div>
  );
}

export function ProtectionPlanPanel({ goal, candidate, alternatives, decision, busy, walletStatus, suppressMascot = false, onContinue, onRefresh, onOpenCouncil }: {
  goal: Goal;
  candidate: PublicProtectionCandidate;
  alternatives: PublicProtectionCandidate[];
  decision: CouncilDecision;
  busy: boolean;
  walletStatus: "connected" | "wrong-network" | "other";
  suppressMascot?: boolean;
  onContinue: () => void;
  onRefresh: () => void;
  onOpenCouncil: () => void;
}) {
  const approved = decision.status === "approved";
  const cta = walletStatus === "wrong-network" ? "Switch to Base" : walletStatus === "connected" ? "Continue to unsigned preview" : "Connect wallet to continue";
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
      <Card className="overflow-hidden">
        <div className="p-6 sm:p-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StatusBadge tone={approved ? "ready" : decision.status === "disputed" ? "warning" : "error"} label={approved ? "Approved by 3 checks" : decision.status === "disputed" ? "Review disputed" : "Plan blocked"} />
            <span className="text-xs text-[color:var(--foreground-soft)] tabular-nums">Market {formatDate(candidate.marketAsOf, { hour: "numeric", minute: "2-digit" })}</span>
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.055em] sm:text-6xl">A protection plan for {goalName(goal)}.</h1>
          <p className="mt-4 max-w-2xl text-[color:var(--foreground-soft)]">This live ETH put is evaluated for expiry protection only. GoalGuard cannot verify payment-date access while the protocol settlement timing remains unverified.</p>
        </div>
        <div className="border-t border-[var(--border)] bg-[var(--surface-raised)] p-6 sm:p-8">
          <div className="metric-grid grid gap-3">
            <MetricCard label="Payment-date status" value="Settlement timing not verified" tone="accent" hint="No payment-date availability claim is made." />
            <MetricCard label="Goal-date shortfall" value="Not verifiable" tone="accent" hint="The callback has no verified P0 upper bound." />
            <MetricCard label="Protection cost" value={formatUsd(candidate.premiumUsd)} />
            <MetricCard label="Protection ends" value={formatDateTime(candidate.protectionEndAt, goal.timezone)} />
          </div>
          <Alert className="mt-5" tone="error" title="Settlement timing not verified">This option may protect value at expiry, but GoalGuard cannot verify that Base USDC will be available by {formatDateTime(goal.fundsNeededAt, goal.timezone)} and does not assume an early sale.</Alert>
          <dl className="mt-5 grid gap-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:grid-cols-3">
            <div><dt className="text-xs text-[color:var(--foreground-soft)]">Protected floor at expiry</dt><dd className="mt-1 font-semibold tabular-nums">{formatUsd(candidate.protectedFloorAtExpiryUsd)}</dd></div>
            <div><dt className="text-xs text-[color:var(--foreground-soft)]">Funds needed by</dt><dd className="mt-1 font-semibold">{formatDateTime(goal.fundsNeededAt, goal.timezone)}</dd></div>
            <div><dt className="text-xs text-[color:var(--foreground-soft)]">Settlement trigger</dt><dd className="mt-1 font-semibold">Factory callback</dd><dd className="mt-1 text-xs text-[color:var(--foreground-soft)]">Proceeds are Base USDC.</dd></div>
          </dl>
          <section className="mt-9 rounded-[var(--radius-card)] bg-[var(--surface-subtle)] p-5 sm:p-7" aria-labelledby="scenario-title">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">Scenario comparison</p><h2 id="scenario-title" className="mt-2 text-3xl font-semibold tracking-[-0.045em]">What the protection changes</h2></div>
              <p className="text-xs text-[color:var(--foreground-soft)]">Estimated net value after cost</p>
            </div>
            <div className="mt-6"><ScenarioComparison scenarios={candidate.scenarios} /></div>
          </section>
          <div className="mt-8">
            <Accordion title="Protocol facts">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div><dt className="text-xs text-[color:var(--foreground-soft)]">Strike</dt><dd className="mt-1 tabular-nums">{formatUsd(candidate.strikeUsd)}</dd></div>
                <div><dt className="text-xs text-[color:var(--foreground-soft)]">Quantity</dt><dd className="mt-1 tabular-nums">{candidate.quantityUnderlying} ETH</dd></div>
                <div><dt className="text-xs text-[color:var(--foreground-soft)]">Settlement asset</dt><dd className="mt-1">{candidate.settlementTokenSymbol} on Base</dd></div>
                <div><dt className="text-xs text-[color:var(--foreground-soft)]">Goal coverage</dt><dd className="mt-1 tabular-nums">{formatPercentFromBps(candidate.goalCoverageBps)}</dd></div>
                <div><dt className="text-xs text-[color:var(--foreground-soft)]">Expiry shortfall</dt><dd className="mt-1 tabular-nums">{formatUsd(candidate.expiryShortfallUsd)}</dd></div>
              </dl>
            </Accordion>
            <Accordion title="How GoalGuard evaluated this plan"><div className="space-y-3 text-sm leading-6 text-[color:var(--foreground-soft)]"><p>Hard eligibility rules determine selection. The optional Goal Protection Score is unavailable while settlement timing is unverified.</p><p>GoalGuard compares the normalized expiry floor, coverage, premium, protection end, and live fillable quantity. It does not count an early sale or resale value.</p></div></Accordion>
            {alternatives.length ? <Accordion title={alternatives.length + " other viable option" + (alternatives.length === 1 ? "" : "s")}><div>{alternatives.map((item) => <div key={item.id} className="grid gap-2 border-t border-[var(--border)] py-3 text-sm sm:grid-cols-5 sm:items-center"><span>{item.goalAttainment === "settlement_timing_not_verified" ? "Settlement timing not verified" : item.goalAttainment}</span><span>Shortfall {item.goalDateShortfallUsd === null ? "Not verifiable" : formatUsd(item.goalDateShortfallUsd)}</span><span>{formatPercentFromBps(item.goalCoverageBps)} covered</span><span>{formatUsd(item.premiumUsd)}</span><span>Ends {formatDateTime(item.protectionEndAt, goal.timezone)}</span></div>)}</div></Accordion> : null}
          </div>
        </div>
      </Card>
      <aside className="space-y-4">
        <Card tone="accent" className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">Independent review</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">{decision.approvedReviewCount} of 3 checks passed</h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">Council attempt {decision.attempt}. Reviewers explain and challenge; deterministic financial values stay fixed.</p>
          <Button className="mt-5 w-full" variant="secondary" onClick={onOpenCouncil}>Open council review</Button>
        </Card>
        {!approved ? <div className={`grid items-center gap-2 ${suppressMascot ? "grid-cols-1" : "grid-cols-[auto_minmax(0,1fr)]"}`}>{suppressMascot ? null : <PipMascot pose="safe-stop" size="sm" />}<Alert tone={decision.status === "disputed" ? "warning" : "error"} title={decision.status === "disputed" ? "Council needs another look" : "This plan cannot proceed"}>{decision.blockedReasons[0] ?? "Open the council review to see the concern before refreshing live options."}</Alert></div> : null}
        <div className="grid gap-3"><Button onClick={onContinue} disabled={!approved || busy}>{cta}<ArrowRight aria-hidden="true" /></Button><Button variant="ghost" onClick={onRefresh} disabled={busy}>Refresh live options</Button></div>
      </aside>
    </div>
  );
}

export function CouncilDrawer({ decision, open, onClose }: { decision: CouncilDecision; open: boolean; onClose: () => void }) {
  return (
    <Drawer open={open} title="GoalGuard council review" onClose={onClose}>
      <div className="mb-5 flex items-center gap-3">
        <PipMascot pose="explaining" size="sm" />
        <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">Three Gonka roles independently check plan fit, risk, and clarity. Their request IDs make the review traceable.</p>
      </div>
      <div className="grid gap-4">{decision.reviews.map((review) => <CouncilCard key={review.id} review={review} label={roleLabels[review.role]} />)}</div>
      <div className="mt-5"><Alert tone={decision.status === "approved" ? "success" : decision.status === "disputed" ? "warning" : "error"} title={"Council result: " + decision.status}>{decision.blockedReasons.length ? decision.blockedReasons.join(" ") : "All " + decision.approvedReviewCount + " checks approved this plan."}</Alert></div>
    </Drawer>
  );
}

export function PreviewConfirmationPanel({ goal, candidate, walletAddress, acknowledged, busy, onAcknowledged, onBack, onGenerate }: {
  goal: Goal;
  candidate: PublicProtectionCandidate;
  walletAddress: string;
  acknowledged: boolean;
  busy: boolean;
  onAcknowledged: (value: boolean) => void;
  onBack: () => void;
  onGenerate: () => void;
}) {
  return (
    <Card className="mx-auto max-w-5xl overflow-hidden">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 p-6 sm:gap-6 sm:p-9">
        <div>
          <StatusBadge label="Final review · no wallet signature" tone="info" />
          <h1 className="mt-5 text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-5xl">Confirm the facts before generating an unsigned preview.</h1>
          <p className="mt-3 max-w-3xl text-[color:var(--foreground-soft)]">Back makes no API change. Generate calls the preview endpoint once and returns transaction data for inspection only.</p>
        </div>
        <PipMascot key={acknowledged ? "acknowledged" : "unacknowledged"} pose="attentive" active={acknowledged} size="sm" className="-mr-2 sm:mr-0" />
      </div>
      <div className="border-t border-[var(--border)] bg-[var(--surface-raised)] p-6 sm:p-8">
        <div className="metric-grid grid gap-3">
          <MetricCard label="Payment-date status" value="Settlement timing not verified" tone="accent" />
          <MetricCard label="Goal-date shortfall" value="Not verifiable" tone="accent" />
          <MetricCard label="Exact cost" value={formatUsd(candidate.premiumUsd)} />
          <MetricCard label="Protection ends" value={formatDateTime(candidate.protectionEndAt, goal.timezone)} />
          <MetricCard label="Protected floor at expiry" value={formatUsd(candidate.protectedFloorAtExpiryUsd)} />
          <MetricCard label="Funds needed by" value={formatDateTime(goal.fundsNeededAt, goal.timezone)} />
          <MetricCard label="Connected wallet" value={<span className="text-base tabular-nums">{shortenAddress(walletAddress)}</span>} hint="Base · chain ID 8453" />
        </div>
        <Alert className="mt-5" tone="error" title="Confirm the accessibility limit">Payoff is evaluated at expiry. Settlement is initiated by a factory callback with no verified P0 upper bound. No early sale is assumed, proceeds are Base USDC rather than bank-account cash, and this remains unsigned preview data.</Alert>
        <label className="mt-5 flex min-h-14 cursor-pointer items-start gap-3 rounded-[var(--radius-control)] border-2 border-[var(--foreground)] bg-[var(--accent-soft)] p-4 text-sm leading-6 text-[color:var(--accent-soft-foreground)] focus-within:outline-2 focus-within:outline-offset-3 focus-within:outline-[var(--focus-ring)]">
          <input type="checkbox" checked={acknowledged} onChange={(event) => onAcknowledged(event.target.checked)} className="mt-1 size-5 shrink-0 accent-[var(--foreground)]" />
          I understand the payment-date status, expiry floor, exact cost, protection end, Base USDC settlement, no-early-sale assumption, connected wallet, and that this produces unsigned transaction data only.
        </label>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="ghost" onClick={onBack} disabled={busy}><ArrowLeft aria-hidden="true" />Back to plan</Button><Button onClick={onGenerate} disabled={!acknowledged || busy}>{busy ? "Generating unsigned preview…" : "Generate unsigned preview"}<ShieldCheck aria-hidden="true" /></Button></div>
      </div>
    </Card>
  );
}

function readinessDecimals(symbol: string) {
  return symbol === "USDC" ? 6 : 18;
}

export function DemoPreviewReadyPanel({ goal, preview, meta, decision, onStartAnother, onFreshPreview }: {
  goal: Goal;
  preview: TradePreview;
  meta: ApiMeta;
  decision: CouncilDecision;
  onStartAnother: () => void;
  onFreshPreview: () => void;
}) {
  const [seconds, setSeconds] = useState(() => secondsUntil(preview.trade.previewExpiresAt));
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds(secondsUntil(preview.trade.previewExpiresAt)), 1000);
    return () => window.clearInterval(timer);
  }, [preview.trade.previewExpiresAt]);
  const expired = seconds === 0;
  const readiness = Object.entries(preview.walletReadiness);
  const proportional = preview.candidate.coverageMode === "proportional_demo";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <Card tone="white" className="overflow-hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 bg-[var(--surface-strong)] p-6 text-[color:var(--foreground-on-strong)] sm:gap-6 sm:p-10">
          <div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge label={expired ? "Preview expired" : "Demo preview ready"} tone={expired ? "warning" : "ready"} />
              {proportional ? <StatusBadge label="Proportional micro-hedge demo" tone="warning" /> : null}
            </div>
            <h1 className="mt-5 text-4xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl">Protection Plan Ready <span className="text-[color:var(--accent)]">(Demo)</span></h1>
            <p className="mt-4 text-lg font-semibold">No funds moved; no protected position was created</p>
            <p className="mt-2 max-w-3xl text-[color:var(--foreground-on-strong-muted)]">This is a time-limited, unsigned snapshot of the approved plan and wallet requirements.</p>
          </div>
          <div className="grid size-24 place-items-center rounded-full bg-[var(--white)] sm:size-36">
            <PipMascot pose={expired ? "safe-stop" : "ready"} surface="light" size="sm" form="full" className="h-24 w-24 sm:h-32 sm:w-36" />
          </div>
        </div>
        <div className="p-6 sm:p-8">
          <div className="metric-grid grid gap-3">
            <MetricCard label="Payment-date status" value="Settlement timing not verified" tone="accent" />
            <MetricCard label="Goal-date shortfall" value="Not verifiable" tone="accent" />
            <MetricCard label="Proposed cost" value={formatUsd(preview.candidate.premiumUsd)} />
            <MetricCard label="Protection ends" value={formatDateTime(preview.candidate.protectionEndAt, goal.timezone)} />
            <MetricCard label="Protected floor at expiry" value={formatUsd(preview.candidate.protectedFloorAtExpiryUsd)} />
            {proportional ? <MetricCard label="Goal coverage" value={formatPercentFromBps(preview.candidate.goalCoverageBps)} /> : null}
            <MetricCard label="Expires in" value={<span className={(expired ? "text-[color:var(--accent)] " : "") + "tabular-nums"}>{formatCountdown(seconds)}</span>} />
          </div>
          <Alert className="mt-5" tone="error" title="Settlement timing not verified">The displayed floor is evaluated at expiry only. GoalGuard cannot verify Base USDC availability by {formatDateTime(goal.fundsNeededAt, goal.timezone)} and does not assume an early sale.</Alert>
          {proportional ? <Alert className="mt-3" tone="warning" title="Partial goal coverage">This proportional demo does not fully protect the original amount. It covers {formatPercentFromBps(preview.candidate.goalCoverageBps)} of the stated goal.</Alert> : null}

          <section className="mt-8" aria-labelledby="readiness-title">
            <h2 id="readiness-title" className="text-3xl font-semibold tracking-[-0.045em]">Wallet readiness</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {readiness.map(([key, item]) => {
                const decimals = readinessDecimals(item.symbol);
                return (
                  <div key={key} className="border-t border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="flex items-center gap-2"><CheckCircle weight={item.sufficient ? "fill" : "regular"} className={item.sufficient ? "text-[color:var(--positive)]" : "text-[color:var(--negative)]"} aria-hidden="true" /><p className="text-sm font-semibold capitalize">{key.replace(/([A-Z])/g, " $1")}</p></div>
                    <p className="mt-3 text-xs text-[color:var(--foreground-soft)] tabular-nums">Balance {formatBaseUnits(item.balanceBaseUnits, decimals)} {item.symbol}</p>
                    <p className="mt-1 text-xs text-[color:var(--foreground-soft)] tabular-nums">Required {formatBaseUnits(item.requiredBaseUnits, decimals)} {item.symbol}</p>
                    <p className="mt-2 text-xs font-semibold">{item.sufficient ? "Requirement met" : "Requirement not met"}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {preview.allowance ? (
            <section className="mt-8 border-y border-[var(--border)] py-6">
              <div className="flex items-center gap-3"><Receipt className="size-5" aria-hidden="true" /><h2 className="font-semibold">Allowance requirement</h2></div>
              <p className="mt-3 text-sm text-[color:var(--foreground-soft)]">
                {preview.allowance.approvalRequired
                  ? "An unsigned approval is included for exactly " + formatBaseUnits(preview.allowance.requiredAmountBaseUnits, preview.candidate.settlementTokenDecimals) + " " + preview.candidate.settlementTokenSymbol + ". Current allowance: " + formatBaseUnits(preview.allowance.currentAmountBaseUnits, preview.candidate.settlementTokenDecimals) + "."
                  : "The current allowance already meets the exact preview requirement; no approval transaction is needed."}
              </p>
              {preview.approvalTransaction ? <div className="mt-4"><UnsignedTransactionCard title="Exact token approval" to={preview.approvalTransaction.to} data={preview.approvalTransaction.data} value={preview.approvalTransaction.valueBaseUnits} chainId={preview.approvalTransaction.chainId} /></div> : null}
            </section>
          ) : null}

          <div className="mt-6"><UnsignedTransactionCard title="Protection execution" to={preview.executionTransaction.to} data={preview.executionTransaction.data} value={preview.executionTransaction.valueBaseUnits} chainId={preview.executionTransaction.chainId} /></div>
          {preview.warnings.map((warning) => <Alert key={warning} className="mt-3" tone="warning">{warning}</Alert>)}
          <Alert className="mt-5" tone={preview.referralDisclosure.mayReceiveFee ? "warning" : "info"}>{preview.referralDisclosure.message}</Alert>
        </div>
      </Card>

      <aside className="space-y-4">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">Preview audit</p>
          <dl className="mt-4 space-y-4 text-sm">
            <div><dt className="text-xs text-[color:var(--foreground-soft)]">Generated</dt><dd className="mt-1">{formatDate(meta.timestamp, { hour: "numeric", minute: "2-digit", second: "2-digit" })}</dd></div>
            <div><dt className="text-xs text-[color:var(--foreground-soft)]">Preview request</dt><dd className="overflow-anywhere mt-1 text-xs tabular-nums">{meta.requestId}</dd></div>
            <div><dt className="text-xs text-[color:var(--foreground-soft)]">Council decision</dt><dd className="overflow-anywhere mt-1 text-xs tabular-nums">{decision.id}</dd></div>
          </dl>
          <Accordion title="All Gonka Request IDs">{decision.reviews.map((review) => <p key={review.id} className="overflow-anywhere mt-2 text-xs text-[color:var(--foreground-soft)] tabular-nums">{roleLabels[review.role]} · {review.requestId}</p>)}</Accordion>
        </Card>
        <Alert tone={expired ? "warning" : "success"} title={expired ? "Fresh facts required" : "Safe demo boundary"}>{expired ? "This snapshot expired. Return to the approved plan and generate a new one after reconfirming." : "There is no signing action on this screen and no transaction was sent."}</Alert>
        <Button className="w-full" onClick={expired ? onFreshPreview : onStartAnother}>{expired ? "Review and generate a fresh preview" : "Start another goal"}<ArrowRight aria-hidden="true" /></Button>
      </aside>
    </div>
  );
}

function detailLines(details: JsonValue | null): string[] {
  if (!details) return [];
  if (typeof details === "string" || typeof details === "number" || typeof details === "boolean") return [String(details)];
  if (Array.isArray(details)) return details.flatMap(detailLines).slice(0, 8);
  return Object.entries(details).flatMap(([key, value]) => detailLines(value).map((line) => key.replace(/([A-Z])/g, " $1") + ": " + line)).slice(0, 8);
}

export function WorkflowErrorPanel({ error, onRetry, onEdit }: { error: WorkflowError; onRetry: () => void; onEdit: () => void }) {
  const details = useMemo(() => detailLines(error.details), [error.details]);
  const editFirst = ["NO_SUITABLE_CANDIDATE", "GOAL_INCOMPLETE"].includes(error.code);
  return (
    <Card className="mx-auto max-w-3xl p-6 sm:p-10">
      <div className="flex items-start justify-between gap-4"><span className="grid size-14 shrink-0 place-items-center rounded-full bg-[var(--negative-surface)] text-[color:var(--negative)]"><Warning className="size-7" aria-hidden="true" /></span><PipMascot pose="safe-stop" size="sm" /></div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">{error.code.replaceAll("_", " ")}</p>
      <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.05em]">The protection flow stopped safely.</h1>
      <p className="mt-4 text-[color:var(--foreground-soft)]">{error.message}</p>
      {details.length ? <div className="mt-5 border-y border-[var(--border)] py-4"><p className="text-sm font-semibold">What the live check found</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[color:var(--foreground-soft)]">{details.map((line, index) => <li key={`${index}:${line}`}>{line}</li>)}</ul></div> : null}
      {error.requestId ? <p className="overflow-anywhere mt-5 text-xs tabular-nums">Request {error.requestId}</p> : null}
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">{error.retryable && !editFirst ? <Button onClick={onRetry}>Try this step again</Button> : null}<Button variant={editFirst ? "primary" : "secondary"} onClick={onEdit}><PencilSimple aria-hidden="true" />Edit goal constraints</Button></div>
    </Card>
  );
}

export function ReadOnlyTradePanel({ goal, trade, onStartAnother }: { goal: Goal; trade: Trade; onStartAnother: () => void }) {
  return (
    <Card className="mx-auto max-w-3xl p-6 sm:p-10">
      <StatusBadge tone="warning" label="Historical live-execution record" />
      <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.05em]">This goal has an existing transaction record.</h1>
      <p className="mt-3 text-[color:var(--foreground-soft)]">The current P0 interface is preview-only, so it does not expose signing, submission, or transaction mutation actions. This read-only record is preserved for audit safety.</p>
      <dl className="mt-6 grid gap-3 sm:grid-cols-2"><MetricCard label="Purpose" value={goalName(goal)} /><MetricCard label="Trade status" value={trade.status} /><MetricCard label="Wallet" value={<span className="text-sm tabular-nums">{shortenAddress(trade.walletAddress)}</span>} /><MetricCard label="Trade reference" value={<span className="overflow-anywhere text-xs tabular-nums">{trade.id}</span>} /></dl>
      <Button className="mt-7" onClick={onStartAnother}>Start another goal</Button>
    </Card>
  );
}

export function CopyableValue({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="text-xs text-[color:var(--foreground-soft)]">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <code className="overflow-anywhere min-w-0 flex-1 text-xs tabular-nums">{value}</code>
        <button className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-[var(--surface-soft)]" aria-label={"Copy " + label} onClick={async () => { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1500); }}><Copy aria-hidden="true" /></button>
        <span className="sr-only" aria-live="polite">{copied ? label + " copied" : ""}</span>
      </div>
    </div>
  );
}
