"use client";

import { ArrowLeft, ArrowRight, CheckCircle, Copy, HourglassHigh, PencilSimple, Receipt, ShieldCheck, Warning } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";

import { NiulaiMascot, type NiulaiPose } from "@/components/brand/niulai-mascot";
import { Accordion } from "@/components/ui/accordion";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Field } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/status-badge";
import { CouncilCard, MetricCard, ScenarioComparison, UnsignedTransactionCard } from "@/components/workflow/workflow-primitives";
import { UpdateGoalRequestSchema, type ApiMeta, type CouncilDecision, type Goal, type GoalType, type JsonValue, type PublicProtectionCandidate, type Trade, type TradePreview, type UpdateGoalRequest } from "@/lib/contracts";
import { formatBaseUnits, formatCountdown, formatDate, formatPercentFromBps, formatUsd, secondsUntil, shortenAddress } from "@/lib/frontend/format";
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
    deadline: goal.deadline,
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
    if (Number(values.protectedValueUsd) <= 0) immediate.protectedValueUsd = ["Enter an amount greater than zero."];
    if (!Number.isFinite(Number(values.maxLossPercent)) || Number(values.maxLossPercent) < 0 || Number(values.maxLossPercent) >= 100) {
      immediate.maxLossBps = ["Enter a loss limit from 0 to 99.99%."];
    }
    if (values.maxPremiumUsd.trim() && Number(values.maxPremiumUsd) <= 0) {
      immediate.maxPremiumUsd = ["Enter a protection cost greater than zero, or leave it blank."];
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
      deadline: values.deadline,
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
          <p className="mt-4 max-w-xl text-[color:var(--foreground-soft)]">Confirm the amount, deadline, and acceptable downside before GoalGuard checks a live option.</p>
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
          <Field label="Purpose deadline" htmlFor="deadline" error={firstError(errors, "deadline")}>
            <input id="deadline" type="date" className="field-control" value={values.deadline} onChange={(event) => update("deadline", event.target.value)} aria-invalid={Boolean(firstError(errors, "deadline"))} aria-describedby={describedBy("deadline")} />
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
        <Card tone="white" className="flex items-center gap-4 p-4">
          <NiulaiMascot pose="listening" size="sm" className="h-24 w-28" />
          <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">Set the purpose, amount, and limits at your pace. Nothing moves while you edit.</p>
        </Card>
        <MetricCard label="Purpose" value={goalName(goal)} tone="accent" />
        <MetricCard label="Asset" value="ETH on Base" hint="One supported network keeps the preview easy to verify." />
        <Alert tone="info" title="Unsigned preview only">No transaction will be signed or broadcast from this experience.</Alert>
      </aside>
    </div>
  );
}

export function ActiveProtectionPanel({ stage }: { stage: "searching_candidates" | "reviewing_candidate" | "generating_preview" }) {
  const content = stage === "searching_candidates"
    ? ["Checking live protection", "GoalGuard is reading active ETH put options from Thetanuts and applying your exact limits."]
    : stage === "reviewing_candidate"
      ? ["Three independent checks", "The AI council is reviewing fit, downside risk, and clarity. Deterministic values cannot be changed by the reviewers."]
      : ["Generating unsigned preview", "GoalGuard is revalidating the approved option, wallet readiness, allowance, and exact Base calldata."];
  const niulaiPose: NiulaiPose = stage === "searching_candidates" ? "checking" : stage === "reviewing_candidate" ? "explaining" : "attentive";

  return (
    <div className="relative isolate mx-auto grid min-h-[34rem] max-w-5xl overflow-hidden rounded-[var(--radius-section)] bg-[var(--surface-dark)] text-[color:var(--text-on-dark)] lg:grid-cols-[1fr_20rem]">
      <div className="absolute -bottom-44 -left-32 size-[30rem] rounded-full border-[5rem] border-[var(--accent)] opacity-15" aria-hidden="true" />
      <div className="relative flex flex-col justify-center p-7 sm:p-12 lg:p-16">
        <div><StatusBadge tone="info" label="Live request active" /></div>
        <h1 className="mt-7 max-w-2xl text-5xl font-semibold leading-[0.98] tracking-[-0.05em] sm:text-6xl">{content[0]}</h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-[color:var(--text-on-dark-muted)]">{content[1]}</p>
        <div className="mt-9 flex items-center gap-3 text-sm" role="status"><HourglassHigh className="size-5 animate-pulse motion-reduce:animate-none" aria-hidden="true" />Waiting for a truthful backend result. No simulated percentage.</div>
      </div>
      <div className="relative overflow-hidden border-t border-[var(--dark-border)] px-7 py-7 lg:min-h-0 lg:border-l lg:border-t-0 lg:px-8 lg:py-8">
        <ol className="relative z-10 text-sm text-[color:var(--foreground-on-strong-muted)]" aria-label="Live request provenance">
          <li className="border-t border-[var(--dark-border)] py-4">01 · Read authoritative inputs</li>
          <li className="border-t border-[var(--dark-border)] py-4">02 · Apply deterministic checks</li>
          <li className="border-y border-[var(--dark-border)] py-4">03 · Return an auditable result</li>
        </ol>
        <div data-niulai-placement="active-request" className="relative z-10 ml-auto mt-5 h-56 w-64 lg:absolute lg:bottom-0 lg:right-1 lg:mt-0 lg:h-64 lg:w-72">
          <NiulaiMascot pose={niulaiPose} surface="dark" active size="lg" className="h-full w-full" />
        </div>
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
  const isPhysical = candidate.settlementType === "physical";
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
      <Card className="overflow-hidden">
        <div className="p-6 sm:p-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={approved ? "ready" : decision.status === "disputed" ? "warning" : "error"} label={approved ? "Approved by 3 checks" : decision.status === "disputed" ? "Review disputed" : "Plan blocked"} />
              <StatusBadge tone={isPhysical ? "warning" : "info"} label={isPhysical ? "Asset-Delivery Protection" : "Cash Protection"} />
            </div>
            <span className="text-xs text-[color:var(--foreground-soft)] tabular-nums">Market {formatDate(candidate.marketAsOf, { hour: "numeric", minute: "2-digit" })}</span>
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.055em] sm:text-6xl">A protection plan for {goalName(goal)}.</h1>
          <p className="mt-4 max-w-2xl text-[color:var(--foreground-soft)]">A live ETH put limits the selected downside through its displayed expiry. It does not guarantee the full goal after that time.</p>
          <Alert className="mt-4" tone={isPhysical ? "warning" : "info"} title={isPhysical ? "This is asset-delivery protection" : "This is cash protection"}>
            {isPhysical
              ? "No cash-settled option was available, so this plan uses asset-delivery settlement instead. Under the settlement conditions shown below, your covered ETH may be delivered/exchanged, and you would receive a USD-linked settlement asset instead. This is different from a cash payout."
              : "If ETH falls, you keep your ETH and receive a cash top-up according to the settlement conditions shown below."}
          </Alert>
        </div>
        <div className="border-t border-[var(--border)] bg-[var(--surface-raised)] p-6 sm:p-8">
          <div className="metric-grid grid gap-3">
            <MetricCard label="Goal amount" value={formatUsd(goal.protectedValueUsd)} />
            <MetricCard label="Protection cost" value={formatUsd(candidate.premiumUsd)} tone="accent" />
            <MetricCard label="Estimated floor" value={formatUsd(candidate.estimatedFloorUsd)} tone="accent" />
            <MetricCard label="Ends" value={formatDate(candidate.expiry)} />
          </div>
          <Alert className="mt-5" tone={candidate.deadlineGapHours > 24 ? "warning" : "info"} title="Deadline alignment">Protection expires {candidate.deadlineGapHours} hour{candidate.deadlineGapHours === 1 ? "" : "s"} from the goal deadline. Settlement conditions apply at expiry.</Alert>
          <section className="mt-9 rounded-[var(--radius-card)] bg-[var(--surface-subtle)] p-5 sm:p-7" aria-labelledby="scenario-title">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">Scenario comparison</p><h2 id="scenario-title" className="mt-2 text-3xl font-semibold tracking-[-0.045em]">What the protection changes</h2></div>
              <p className="text-xs text-[color:var(--foreground-soft)]">Estimated net value after cost</p>
            </div>
            <div className="mt-6"><ScenarioComparison scenarios={candidate.scenarios} settlementType={candidate.settlementType} strikeUsd={candidate.strikeUsd} /></div>
          </section>
          <div className="mt-8">
            <Accordion title="Protocol facts">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div><dt className="text-xs text-[color:var(--foreground-soft)]">Strike</dt><dd className="mt-1 tabular-nums">{formatUsd(candidate.strikeUsd)}</dd></div>
                <div><dt className="text-xs text-[color:var(--foreground-soft)]">Quantity</dt><dd className="mt-1 tabular-nums">{candidate.quantityUnderlying} ETH</dd></div>
                <div><dt className="text-xs text-[color:var(--foreground-soft)]">Settlement asset</dt><dd className="mt-1">{candidate.settlementTokenSymbol}</dd></div>
                <div><dt className="text-xs text-[color:var(--foreground-soft)]">Goal coverage</dt><dd className="mt-1 tabular-nums">{formatPercentFromBps(candidate.goalCoverageBps)}</dd></div>
              </dl>
            </Accordion>
            {alternatives.length ? <Accordion title={alternatives.length + " other viable option" + (alternatives.length === 1 ? "" : "s")}><div>{alternatives.map((item) => <div key={item.id} className="flex min-h-12 items-center justify-between gap-4 border-t border-[var(--border)] py-3"><span>Ends {formatDate(item.expiry)}</span><span className="font-semibold tabular-nums">{formatUsd(item.premiumUsd)}</span></div>)}</div></Accordion> : null}
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
        {!approved ? <div className={`grid items-center gap-2 ${suppressMascot ? "grid-cols-1" : "grid-cols-[auto_minmax(0,1fr)]"}`}>{suppressMascot ? null : <NiulaiMascot pose="safe-stop" size="sm" />}<Alert tone={decision.status === "disputed" ? "warning" : "error"} title={decision.status === "disputed" ? "Council needs another look" : "This plan cannot proceed"}>{decision.blockedReasons[0] ?? "Open the council review to see the concern before refreshing live options."}</Alert></div> : null}
        <div className="grid gap-3"><Button onClick={onContinue} disabled={!approved || busy}>{cta}<ArrowRight aria-hidden="true" /></Button><Button variant="ghost" onClick={onRefresh} disabled={busy}>Refresh live options</Button></div>
      </aside>
    </div>
  );
}

export function CouncilDrawer({ decision, open, onClose }: { decision: CouncilDecision; open: boolean; onClose: () => void }) {
  return (
    <Drawer open={open} title="GoalGuard council review" onClose={onClose}>
      <div className="mb-5 flex min-w-0 items-center gap-3">
        <NiulaiMascot pose="explaining" size="sm" />
        <p className="min-w-0 text-sm leading-6 text-[color:var(--foreground-soft)]">Three AI roles independently check plan fit, risk, and clarity. Their request IDs make the review traceable.</p>
      </div>
      <div className="grid gap-4">{decision.reviews.map((review) => <CouncilCard key={review.id} review={review} label={roleLabels[review.role]} />)}</div>
      <div className="mt-5"><Alert tone={decision.status === "approved" ? "success" : decision.status === "disputed" ? "warning" : "error"} title={"Council result: " + decision.status}>{decision.blockedReasons.length ? decision.blockedReasons.join(" ") : "All " + decision.approvedReviewCount + " checks approved this plan."}</Alert></div>
    </Drawer>
  );
}

export function PreviewConfirmationPanel({ goal, candidate, walletAddress, acknowledged, physicalSettlementAcknowledged, busy, onAcknowledged, onPhysicalSettlementAcknowledged, onBack, onGenerate }: {
  goal: Goal;
  candidate: PublicProtectionCandidate;
  walletAddress: string;
  acknowledged: boolean;
  physicalSettlementAcknowledged: boolean;
  busy: boolean;
  onAcknowledged: (value: boolean) => void;
  onPhysicalSettlementAcknowledged: (value: boolean) => void;
  onBack: () => void;
  onGenerate: () => void;
}) {
  const isPhysical = candidate.settlementType === "physical";
  const canGenerate = acknowledged && (!isPhysical || physicalSettlementAcknowledged);
  return (
    <Card className="mx-auto max-w-5xl overflow-hidden">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 p-6 sm:gap-6 sm:p-9">
        <div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge label="Final review · no wallet signature" tone="info" />
            <StatusBadge tone={isPhysical ? "warning" : "info"} label={isPhysical ? "Asset-Delivery Protection" : "Cash Protection"} />
          </div>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-5xl">Confirm the facts before generating an unsigned preview.</h1>
          <p className="mt-3 max-w-3xl text-[color:var(--foreground-soft)]">Back makes no API change. Generate calls the preview endpoint once and returns transaction data for inspection only.</p>
        </div>
        <NiulaiMascot key={acknowledged ? "acknowledged" : "unacknowledged"} pose="attentive" active={acknowledged} size="sm" className="-mr-2 sm:mr-0" />
      </div>
      <div className="border-t border-[var(--border)] bg-[var(--surface-raised)] p-6 sm:p-8">
        <div className="metric-grid grid gap-3">
          <MetricCard label="Purpose" value={goalName(goal)} />
          <MetricCard label="Exact cost" value={formatUsd(candidate.premiumUsd)} tone="accent" />
          <MetricCard label="Maximum cost at risk" value={formatUsd(candidate.maxPremiumLossUsd)} />
          <MetricCard label="Coverage" value={formatPercentFromBps(candidate.goalCoverageBps)} />
          <MetricCard label="Expiry conditions" value={formatDate(candidate.expiry)} hint={"Expiry is " + candidate.deadlineGapHours + " hours from the goal deadline."} />
          <MetricCard label="Connected wallet" value={<span className="text-base tabular-nums">{shortenAddress(walletAddress)}</span>} hint="Base · chain ID 8453" />
        </div>
        <Alert className="mt-5" tone="warning" title="Preview, not protection">Generating the preview does not move funds, create an allowance, sign a transaction, or create a protected position.</Alert>
        <label className="mt-5 flex min-h-14 cursor-pointer items-start gap-3 rounded-[var(--radius-control)] border-2 border-[var(--foreground)] bg-[var(--accent-soft)] p-4 text-sm leading-6 text-[color:var(--accent-soft-foreground)] focus-within:outline-2 focus-within:outline-offset-3 focus-within:outline-[var(--focus-ring)]">
          <input type="checkbox" checked={acknowledged} onChange={(event) => onAcknowledged(event.target.checked)} className="mt-1 size-5 shrink-0 accent-[var(--foreground)]" />
          I understand the exact cost, expiry, coverage, connected wallet, and that this produces unsigned transaction data only.
        </label>
        {isPhysical ? (
          <label className="mt-3 flex min-h-14 cursor-pointer items-start gap-3 rounded-[var(--radius-control)] border-2 border-[var(--negative)] bg-[var(--negative-surface)] p-4 text-sm leading-6 focus-within:outline-2 focus-within:outline-offset-3 focus-within:outline-[var(--focus-ring)]">
            <input type="checkbox" checked={physicalSettlementAcknowledged} onChange={(event) => onPhysicalSettlementAcknowledged(event.target.checked)} className="mt-1 size-5 shrink-0 accent-[var(--negative)]" />
            I understand this position settles by asset delivery, not a cash payout, and my ETH may be delivered at settlement.
          </label>
        ) : null}
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="ghost" onClick={onBack} disabled={busy}><ArrowLeft aria-hidden="true" />Back to plan</Button><Button onClick={onGenerate} disabled={!canGenerate || busy}>{busy ? "Generating unsigned preview…" : "Generate unsigned preview"}<ShieldCheck aria-hidden="true" /></Button></div>
      </div>
    </Card>
  );
}

// "gas" and "underlyingExposure" are always native/wrapped ETH (18 decimals); "settlementToken"
// must use the candidate's own verified decimals -- it is never assumed to be USDC/6-decimal,
// since a physical candidate's settlement token (e.g. aBasUSDC) may differ.
function readinessDecimals(key: string, settlementTokenDecimals: number) {
  return key === "settlementToken" ? settlementTokenDecimals : 18;
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
        <div className="relative min-h-[22rem] overflow-hidden bg-[var(--surface-strong)] p-6 text-[color:var(--foreground-on-strong)] sm:p-10 min-[700px]:min-h-[24rem]">
          <div data-niulai-copy="demo-ready" className="relative z-10 min-[700px]:max-w-[calc(100%_-_13rem)]">
            <div className="flex flex-wrap gap-2">
              <StatusBadge label={expired ? "Preview expired" : "Demo preview ready"} tone={expired ? "warning" : "ready"} />
              {proportional ? <StatusBadge label="Proportional micro-hedge demo" tone="warning" /> : null}
            </div>
            <h1 className="mt-5 text-4xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl">Protection Plan Ready <span className="text-[color:var(--accent)]">(Demo)</span></h1>
            <p className="mt-4 text-lg font-semibold">No funds moved; no protected position was created</p>
            <p className="mt-2 max-w-3xl text-[color:var(--foreground-on-strong-muted)]">This is a time-limited, unsigned snapshot of the approved plan and wallet requirements.</p>
          </div>
          <div data-niulai-placement="demo-ready" className="relative z-10 ml-auto mt-5 h-48 w-52 min-[700px]:absolute min-[700px]:bottom-0 min-[700px]:right-2 min-[700px]:mt-0 min-[700px]:h-64 min-[700px]:w-72">
            <NiulaiMascot pose={expired ? "safe-stop" : "ready"} surface="dark" size="lg" form="full" className="h-full w-full" />
          </div>
        </div>
        <div className="p-6 sm:p-8">
          <div className="metric-grid grid gap-3">
            <MetricCard label="Purpose" value={goalName(goal)} />
            <MetricCard label="Proposed cost" value={formatUsd(preview.candidate.premiumUsd)} tone="accent" />
            <MetricCard label="Estimated floor" value={formatUsd(preview.candidate.estimatedFloorUsd)} tone="accent" />
            {proportional ? <MetricCard label="Goal coverage" value={formatPercentFromBps(preview.candidate.goalCoverageBps)} /> : null}
            <MetricCard label="Expires in" value={<span className={(expired ? "text-[color:var(--accent)] " : "") + "tabular-nums"}>{formatCountdown(seconds)}</span>} />
          </div>
          {proportional ? <Alert className="mt-5" tone="warning" title="Partial goal coverage">This proportional demo does not fully protect the original amount. It covers {formatPercentFromBps(preview.candidate.goalCoverageBps)} of the stated goal.</Alert> : null}

          <section className="mt-8" aria-labelledby="readiness-title">
            <h2 id="readiness-title" className="text-3xl font-semibold tracking-[-0.045em]">Wallet readiness</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {readiness.map(([key, item]) => {
                const decimals = readinessDecimals(key, preview.candidate.settlementTokenDecimals);
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
          <Accordion title="All AI Request IDs">{decision.reviews.map((review) => <p key={review.id} className="overflow-anywhere mt-2 text-xs text-[color:var(--foreground-soft)] tabular-nums">{roleLabels[review.role]} · {review.requestId}</p>)}</Accordion>
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
      <div className="flex items-start justify-between gap-4"><span className="grid size-14 shrink-0 place-items-center rounded-full bg-[var(--negative-surface)] text-[color:var(--negative)]"><Warning className="size-7" aria-hidden="true" /></span><NiulaiMascot pose="safe-stop" size="sm" className="h-24 w-28" /></div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">{error.code.replaceAll("_", " ")}</p>
      <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.05em]">The protection flow stopped safely.</h1>
      <p className="mt-4 text-[color:var(--foreground-soft)]">{error.message}</p>
      {details.length ? <div className="mt-5 min-w-0 overflow-hidden border-y border-[var(--border)] py-4"><p className="text-sm font-semibold">What the live check found</p><ul className="mt-2 min-w-0 list-disc space-y-1 pl-5 text-sm text-[color:var(--foreground-soft)]">{details.map((line, index) => <li className="min-w-0 overflow-anywhere" key={`${index}:${line}`}>{line}</li>)}</ul></div> : null}
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
