"use client";

import Decimal from "decimal.js";
import { useEffect, useState } from "react";

import { Accordion } from "@/components/ui/accordion";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Field } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tooltip } from "@/components/ui/tooltip";
import {
  UpdateGoalRequestSchema,
  type CouncilDecision,
  type Goal,
  type ProtectionCandidate,
  type Trade,
  type TradePreview,
  type UpdateGoalRequest,
} from "@/lib/contracts";
import { baseTransactionUrl, formatCountdown, formatDate, formatPercentFromBps, formatUsd, secondsUntil, shortenAddress } from "@/lib/frontend/format";

const goalLabels = {
  rent: "Rent",
  tuition: "Tuition",
  travel: "Travel",
  emergency: "Emergency fund",
  custom: "Custom goal",
} as const;

const roleLabels = {
  strategist: "Strategist",
  risk_auditor: "Risk Auditor",
  consumer_advocate: "Consumer Advocate",
} as const;

export function GoalConfirmationForm({
  goal,
  busy,
  fieldErrors,
  onSave,
  onFind,
}: {
  goal: Goal;
  busy: boolean;
  fieldErrors: Record<string, string[]>;
  onSave: (value: UpdateGoalRequest) => Promise<void>;
  onFind: (value: UpdateGoalRequest) => Promise<void>;
}) {
  const [goalType, setGoalType] = useState(goal.goalType);
  const [customGoalLabel, setCustomGoalLabel] = useState(goal.customGoalLabel ?? "");
  const [protectedValueUsd, setProtectedValueUsd] = useState(goal.protectedValueUsd);
  const [deadline, setDeadline] = useState(goal.deadline);
  const [maxLossPercent, setMaxLossPercent] = useState(new Decimal(goal.maxLossBps).div(100).toString());
  const [maxPremiumUsd, setMaxPremiumUsd] = useState(goal.maxPremiumUsd ?? "");
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  function value(): UpdateGoalRequest | null {
    const errors: Record<string, string> = {};
    let maxLossBps = -1;
    try {
      const loss = new Decimal(maxLossPercent);
      const bps = loss.mul(100);
      if (!bps.isInteger()) errors.maxLossBps = "Use no more than two decimal places.";
      else maxLossBps = bps.toNumber();
    } catch { errors.maxLossBps = "Enter a valid percentage."; }
    try {
      if (!new Decimal(protectedValueUsd).greaterThan(0)) errors.protectedValueUsd = "Enter an amount greater than zero.";
    } catch { errors.protectedValueUsd = "Enter a valid amount."; }
    if (maxPremiumUsd) {
      try { if (!new Decimal(maxPremiumUsd).greaterThan(0)) errors.maxPremiumUsd = "Enter an amount greater than zero."; }
      catch { errors.maxPremiumUsd = "Enter a valid amount."; }
    }
    if (Date.parse(`${deadline}T23:59:59Z`) <= Date.now()) errors.deadline = "Choose a future date.";
    const candidate = {
      goalType,
      customGoalLabel: goalType === "custom" ? customGoalLabel.trim() || null : null,
      underlyingAsset: "ETH" as const,
      protectedValueUsd,
      deadline,
      maxLossBps,
      maxPremiumUsd: maxPremiumUsd || null,
    };
    const parsed = UpdateGoalRequestSchema.safeParse(candidate);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        errors[key] ??= issue.message;
      }
    }
    setLocalErrors(errors);
    return Object.keys(errors).length ? null : parsed.success ? parsed.data : null;
  }

  async function submit(action: "save" | "find") {
    const parsed = value();
    if (!parsed) return;
    await (action === "save" ? onSave(parsed) : onFind(parsed));
  }

  const error = (key: string) => localErrors[key] ?? fieldErrors[key]?.[0];
  return (
    <Card className="p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Confirm your intent</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white">Make sure GoalGuard understood you.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#9daca2]">These constraints are saved before any live protection option is considered. Your wallet is not required yet.</p>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <Field label="Goal" htmlFor="goalType" error={error("goalType")}>
          <select id="goalType" value={goalType} onChange={(event) => setGoalType(event.target.value as Goal["goalType"])} className="field-control" aria-invalid={Boolean(error("goalType"))}>
            {Object.entries(goalLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        {goalType === "custom" ? (
          <Field label="Custom goal name" htmlFor="customGoalLabel" error={error("customGoalLabel")}>
            <input id="customGoalLabel" value={customGoalLabel} maxLength={80} onChange={(event) => setCustomGoalLabel(event.target.value)} className="field-control" aria-invalid={Boolean(error("customGoalLabel"))} />
          </Field>
        ) : (
          <Field label="Asset" htmlFor="asset" hint="P0 supports ETH protection only."><input id="asset" value="ETH" readOnly className="field-control opacity-75" /></Field>
        )}
        <Field label="Amount you need to preserve (USD)" htmlFor="protectedValueUsd" error={error("protectedValueUsd")}>
          <input id="protectedValueUsd" inputMode="decimal" value={protectedValueUsd} onChange={(event) => setProtectedValueUsd(event.target.value)} className="field-control" aria-invalid={Boolean(error("protectedValueUsd"))} />
        </Field>
        <Field label="Needed by" htmlFor="deadline" error={error("deadline")}>
          <input id="deadline" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} className="field-control" aria-invalid={Boolean(error("deadline"))} />
        </Field>
        <Field label="Maximum acceptable loss" htmlFor="maxLossBps" hint="Enter a percentage below 100%." error={error("maxLossBps")}>
          <div className="relative"><input id="maxLossBps" inputMode="decimal" value={maxLossPercent} onChange={(event) => setMaxLossPercent(event.target.value)} className="field-control pr-10" aria-invalid={Boolean(error("maxLossBps"))} /><span className="absolute right-4 top-3 text-sm text-[var(--muted)]">%</span></div>
        </Field>
        <Field label="Maximum protection cost (optional)" htmlFor="maxPremiumUsd" error={error("maxPremiumUsd")}>
          <input id="maxPremiumUsd" inputMode="decimal" value={maxPremiumUsd} onChange={(event) => setMaxPremiumUsd(event.target.value)} placeholder="No limit supplied" className="field-control" aria-invalid={Boolean(error("maxPremiumUsd"))} />
        </Field>
      </div>

      <Accordion title="Original request">
        <p>“{goal.originalUserMessage}”</p>
      </Accordion>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" disabled={busy} onClick={() => void submit("save")}>{busy ? "Saving…" : "Save changes"}</Button>
        <Button disabled={busy} onClick={() => void submit("find")}>{busy ? "Working…" : "Find protection options"} <span aria-hidden="true">→</span></Button>
      </div>
    </Card>
  );
}

export function CouncilDrawer({ decision, open, onClose }: { decision: CouncilDecision; open: boolean; onClose: () => void }) {
  return (
    <Drawer open={open} onClose={onClose} title="GoalGuard review">
      <Alert tone={decision.status === "approved" ? "success" : decision.status === "disputed" ? "warning" : "error"} title={`Decision: ${decision.status}`}>
        {decision.status === "approved" ? "All three independent roles approved this candidate." : "This plan cannot progress to a trade in its current state."}
      </Alert>
      <div className="mt-6 space-y-4">
        {decision.reviews.map((review) => (
          <article key={review.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="font-semibold text-white">{roleLabels[review.role]}</h3><p className="mt-1 text-xs text-[var(--muted)]">{review.model}</p></div>
              <StatusBadge label={review.verdict} tone={review.verdict === "approve" ? "ready" : review.verdict === "uncertain" ? "warning" : "error"} />
            </div>
            <p className="mt-4 text-sm leading-6 text-[#c3d0c7]">{review.summary}</p>
            {review.concerns.length ? <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Concerns</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#aebcb2]">{review.concerns.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
            {review.requiredDisclosures.length ? <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Required disclosures</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#aebcb2]">{review.requiredDisclosures.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
            <p className="mt-4 break-all font-mono text-[11px] text-[#7f9185]">Gonka Request ID: {review.requestId}</p>
          </article>
        ))}
      </div>
      {decision.blockedReasons.length ? <Alert tone="error" title="Blocked reasons" className="mt-5"><ul className="list-disc pl-5">{decision.blockedReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></Alert> : null}
    </Drawer>
  );
}

export function ProtectionPlanPanel({
  goal,
  candidate,
  alternatives,
  decision,
  busy,
  onOpenCouncil,
  onRefresh,
  onPreview,
}: {
  goal: Goal;
  candidate: ProtectionCandidate;
  alternatives: ProtectionCandidate[];
  decision: CouncilDecision;
  busy: boolean;
  onOpenCouncil: () => void;
  onRefresh: () => void;
  onPreview: () => void;
}) {
  const approved = decision.status === "approved";
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Protection plan</p><h1 className="mt-2 text-3xl font-semibold text-white">{goal.customGoalLabel ?? goalLabels[goal.goalType]} protection</h1></div>
          <StatusBadge label={decision.status} tone={approved ? "ready" : decision.status === "disputed" ? "warning" : "error"} />
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Amount to preserve", formatUsd(goal.protectedValueUsd)],
            ["Protection cost", formatUsd(candidate.premiumUsd)],
            ["Maximum cost at risk", formatUsd(candidate.maxPremiumLossUsd)],
            ["Estimated protected value", formatUsd(candidate.estimatedFloorUsd)],
            ["Protection ends on", formatDate(candidate.expiry)],
            ["Goal coverage", formatPercentFromBps(candidate.goalCoverageBps)],
          ].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/[0.07] bg-black/10 p-4"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-1 font-semibold text-white">{value}</p></div>)}
        </div>
        <Alert className="mt-5">This option provides downside protection only under the displayed payoff and settlement conditions. The estimated protected value is evaluated at expiry.</Alert>
        <div className="mt-5 space-y-3">
          <Accordion title="What happens if ETH moves?" open>
            <div className="grid gap-3 sm:grid-cols-3">
              {candidate.scenarios.map((scenario) => <div key={scenario.key} className="rounded-xl bg-white/[0.04] p-3"><p className="text-xs uppercase tracking-wider text-[var(--muted)]">ETH {scenario.key}</p><p className="mt-1 text-white">{formatUsd(scenario.netProtectedValueUsd)}</p><p className="mt-1 text-xs">at {formatUsd(scenario.settlementPriceUsd)}</p></div>)}
            </div>
          </Accordion>
          <Accordion title="Protocol details">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div><dt className="text-xs text-[var(--muted)]">Strike</dt><dd className="text-white">{formatUsd(candidate.strikeUsd)}</dd></div>
              <div><dt className="text-xs text-[var(--muted)]">Quantity</dt><dd className="text-white">{candidate.quantityUnderlying} ETH</dd></div>
              <div><dt className="text-xs text-[var(--muted)]">Settlement</dt><dd className="text-white">{candidate.settlementTokenSymbol}</dd></div>
              <div><dt className="text-xs text-[var(--muted)]">Market checked</dt><dd className="text-white">{formatDate(candidate.marketAsOf, { hour: "numeric", minute: "2-digit" })}</dd></div>
            </dl>
          </Accordion>
          {alternatives.length ? <Accordion title={`${alternatives.length} other viable option${alternatives.length === 1 ? "" : "s"}`}><div className="space-y-3">{alternatives.map((item, index) => <div key={item.id} className="flex justify-between gap-4 rounded-xl bg-white/[0.04] p-3"><span>#{index + 2} · ends {formatDate(item.expiry)}</span><span className="text-white">{formatUsd(item.premiumUsd)}</span></div>)}</div></Accordion> : null}
        </div>
      </Card>
      <div className="space-y-5">
        <Card className="p-6"><p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Independent review</p><h2 className="mt-2 text-xl font-semibold text-white">{decision.approvedReviewCount}/3 roles approved</h2><p className="mt-2 text-sm leading-6 text-[#9daca2]">Review attempt {decision.attempt}. AI explanations cannot change the deterministic financial values.</p><Button className="mt-5 w-full" variant="secondary" onClick={onOpenCouncil}>Open GoalGuard review</Button></Card>
        {!approved ? <Alert tone={decision.status === "disputed" ? "warning" : "error"} title={decision.status === "disputed" ? "Council disputed" : "Plan blocked"}>This candidate cannot proceed to trade preview. Open the review to see which role raised a concern.</Alert> : null}
        <div className="flex flex-col gap-3">
          <Button onClick={onPreview} disabled={!approved || busy}>{busy ? "Preparing…" : "Preview exact trade"}</Button>
          <Button variant="ghost" onClick={onRefresh} disabled={busy}>Refresh live options</Button>
        </div>
      </div>
    </div>
  );
}

export function TradePreviewPanel({
  preview,
  walletAddress,
  executionEnabled,
  maxPremiumUsd,
  busy,
  onBack,
  onConfirm,
}: {
  preview: TradePreview;
  walletAddress: string;
  executionEnabled: boolean;
  maxPremiumUsd: string;
  busy: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [seconds, setSeconds] = useState(() => secondsUntil(preview.trade.previewExpiresAt));
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds(secondsUntil(preview.trade.previewExpiresAt)), 1000);
    return () => window.clearInterval(timer);
  }, [preview.trade.previewExpiresAt]);
  const expired = seconds === 0;
  const partial = preview.candidate.goalCoverageBps < 10000;
  return (
    <Card className="mx-auto max-w-4xl p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Exact trade preview</p><h1 className="mt-2 text-3xl font-semibold text-white">Review before your wallet opens.</h1></div><StatusBadge label={executionEnabled ? "Live execution enabled" : "Preview only"} tone={executionEnabled ? "warning" : "neutral"} /></div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["Protection cost", formatUsd(preview.candidate.premiumUsd)],
          ["Maximum cost at risk", formatUsd(preview.candidate.maxPremiumLossUsd)],
          ["Protection ends on", formatDate(preview.candidate.expiry)],
          ["Estimated protected value", formatUsd(preview.candidate.estimatedFloorUsd)],
          ["Wallet", shortenAddress(walletAddress)],
          ["Network", "Base · 8453"],
        ].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/[0.07] bg-black/10 p-4"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-1 font-semibold text-white">{value}</p></div>)}
      </div>
      <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4"><span className="text-sm text-[#b9c6bc]">Preview valid for</span><span className={expired ? "font-mono text-[var(--danger-soft)]" : "font-mono text-[var(--accent)]"}>{formatCountdown(seconds)}</span></div>
      {partial ? <Alert className="mt-5" tone="warning" title="Proportional micro-hedge demo">This candidate covers {formatPercentFromBps(preview.candidate.goalCoverageBps)} of the goal and does not fully protect the original amount.</Alert> : null}
      {!executionEnabled ? <Alert className="mt-5" tone="warning" title="Live execution is disabled">You can review the full plan, but signing is unavailable until organizer approval. The live premium cap is {formatUsd(maxPremiumUsd)}.</Alert> : null}
      {preview.warnings.map((warning) => <Alert key={warning} className="mt-3" tone="warning">{warning}</Alert>)}
      <label className="mt-6 flex items-start gap-3 rounded-2xl border border-white/[0.08] p-4 text-sm leading-6 text-[#c2cec5]"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 size-4 accent-[#cbff6b]" />I understand that protection depends on the executed position and its settlement conditions at expiry.</label>
      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="ghost" onClick={onBack}>Back to plan</Button>{executionEnabled ? <Button disabled={!acknowledged || expired || busy} onClick={onConfirm}>{busy ? "Revalidating…" : expired ? "Preview expired" : "Prepare wallet transaction"}</Button> : null}</div>
    </Card>
  );
}

export function TransactionStatusPanel({
  stage,
  trade,
  txHash,
  onApproval,
  onExecution,
  onRefresh,
}: {
  stage: "awaiting_approval_signature" | "awaiting_execution_signature" | "transaction_submitted";
  trade: Trade;
  txHash: string | null;
  onApproval: () => void;
  onExecution: () => void;
  onRefresh: () => void;
}) {
  const copy = stage === "awaiting_approval_signature"
    ? ["Exact token approval", "Your wallet will request only the amount shown in the preview."]
    : stage === "awaiting_execution_signature"
      ? ["Sign the protection trade", "This is the transaction that submits the option order."]
      : ["Transaction submitted", "GoalGuard is waiting for verified confirmation on Base."];
  return (
    <Card className="mx-auto max-w-2xl p-7 text-center sm:p-10">
      <span className="mx-auto grid size-16 place-items-center rounded-full border border-[#cbff6b]/25 bg-[#cbff6b]/10 text-2xl text-[var(--accent)]" aria-hidden="true">{stage === "transaction_submitted" ? "…" : "↗"}</span>
      <h1 className="mt-5 text-3xl font-semibold text-white">{copy[0]}</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#a8b7ad]">{copy[1]} GoalGuard will not call the goal protected until the backend verifies the receipt.</p>
      {txHash ? <a href={baseTransactionUrl(txHash)} target="_blank" rel="noreferrer" className="mt-5 block break-all font-mono text-xs text-[var(--accent)] underline underline-offset-4">View {txHash}</a> : null}
      <div className="mt-7">{stage === "awaiting_approval_signature" ? <Button onClick={onApproval}>Approve exact amount</Button> : stage === "awaiting_execution_signature" ? <Button onClick={onExecution}>Sign protection trade</Button> : <Button variant="secondary" onClick={onRefresh}>Refresh confirmation</Button>}</div>
      <p className="mt-5 text-xs text-[var(--muted)]">Trade reference {trade.id}</p>
    </Card>
  );
}

export function ProtectedGoalPanel({ goal, candidate, decision, trade, explorerUrl }: { goal: Goal; candidate: ProtectionCandidate; decision: CouncilDecision; trade: Trade; explorerUrl: string | null }) {
  const title = goal.customGoalLabel ?? goalLabels[goal.goalType];
  return (
    <Card className="mx-auto max-w-4xl overflow-hidden">
      <div className="border-b border-[#91e95f]/20 bg-[#91e95f]/10 p-7 sm:p-10"><StatusBadge label="Protected" tone="ready" /><h1 className="mt-4 text-4xl font-semibold text-white">{title} is protected.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#c5d5c8]">The backend verified the Base transaction and position. Protection still depends on the executed option and settlement conditions.</p></div>
      <div className="p-7 sm:p-10"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[
        ["Amount to preserve", formatUsd(goal.protectedValueUsd)],
        ["Protection cost", formatUsd(trade.premiumUsd)],
        ["Protection ends on", formatDate(candidate.expiry)],
        ["Estimated protected value", formatUsd(candidate.estimatedFloorUsd)],
        ["Trade confirmed", trade.confirmedAt ? formatDate(trade.confirmedAt, { hour: "numeric", minute: "2-digit" }) : "Verified"],
        ["Council decision", `Attempt ${decision.attempt} · approved`],
      ].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/[0.07] bg-black/10 p-4"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-1 font-semibold text-white">{value}</p></div>)}</div>
      {trade.txHash ? <a href={explorerUrl ?? baseTransactionUrl(trade.txHash)} target="_blank" rel="noreferrer" className="mt-6 inline-flex text-sm font-semibold text-[var(--accent)] underline underline-offset-4">View verified transaction <span aria-hidden="true">↗</span></a> : null}
      <Accordion title="Audit references"><p className="break-all font-mono text-xs">Decision: {decision.id}</p>{decision.reviews.map((review) => <p key={review.id} className="mt-2 break-all font-mono text-xs">{roleLabels[review.role]}: {review.requestId}</p>)}</Accordion>
      </div>
    </Card>
  );
}

export function PlanLanguageHint() {
  return <p className="text-xs text-[var(--muted)]"><Tooltip label="The option price paid for protection">Protection cost</Tooltip> is shown instead of protocol premium in the primary interface.</p>;
}
