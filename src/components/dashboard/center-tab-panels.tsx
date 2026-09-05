"use client";

import { ArrowRight, ChartLine, ClipboardText, Clock, ShieldCheck, WarningCircle } from "@phosphor-icons/react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { CouncilCard, MetricCard, ScenarioComparison } from "@/components/workflow/workflow-primitives";
import type { CouncilDecision, Goal, GoalType, PublicProtectionCandidate, Trade } from "@/lib/contracts";
import { formatDate, formatPercentFromBps, formatUsd } from "@/lib/frontend/format";
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

function decisionTone(decision: CouncilDecision) {
  if (decision.status === "approved") return "ready" as const;
  if (decision.status === "disputed") return "warning" as const;
  return "error" as const;
}

function decisionLabel(decision: CouncilDecision) {
  if (decision.status === "approved") return "Approved by 3 checks";
  if (decision.status === "disputed") return "Review disputed";
  return "Plan blocked";
}

function tradeLabel(status: Trade["status"]) {
  return status === "previewed"
    ? "Preview generated"
    : status === "awaiting_signature"
      ? "Awaiting signature"
      : status.charAt(0).toUpperCase() + status.slice(1);
}

export function MarketEmptyState({ onOpenPlan }: { onOpenPlan: () => void }) {
  return (
    <Card className="p-6 sm:p-9">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[color:var(--accent-soft-foreground)]">
          <ChartLine className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">Market waiting</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em]">Live cost of safety appears after a search.</h2>
          <p className="mt-3 max-w-2xl leading-6 text-[color:var(--foreground-soft)]">GoalGuard needs your amount, deadline, and loss limit before it can compare real protection quotes. Nothing is being guessed while the market is empty.</p>
          <Button className="mt-6" onClick={onOpenPlan}>Open your plan <ArrowRight aria-hidden="true" /></Button>
        </div>
      </div>
    </Card>
  );
}

export function CandidateReviewPanel({ goal, candidate }: { goal: Goal; candidate: PublicProtectionCandidate }) {
  return (
    <Card className="p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone="info" label="Council review in progress" />
            <StatusBadge tone={candidate.settlementType === "physical" ? "warning" : "info"} label={candidate.settlementType === "physical" ? "Asset-delivery protection" : "Cash protection"} />
          </div>
          <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-[-0.05em]">Checking this live option for {goalName(goal)}.</h2>
          <p className="mt-3 max-w-2xl leading-6 text-[color:var(--foreground-soft)]">The candidate stays visible while three independent Gonka roles check fit, downside risk, and plain-language disclosures. Watch each role&apos;s real status in the AI Council rail.</p>
        </div>
        <Clock className="size-7 shrink-0 text-[color:var(--accent)]" aria-hidden="true" />
      </div>
      <div className="metric-grid mt-7">
        <MetricCard label="Goal amount" value={formatUsd(goal.protectedValueUsd)} />
        <MetricCard label="Protection cost" value={formatUsd(candidate.premiumUsd)} tone="accent" />
        <MetricCard label="Estimated floor" value={formatUsd(candidate.estimatedFloorUsd)} tone="accent" />
        <MetricCard label="Coverage" value={formatPercentFromBps(candidate.goalCoverageBps)} />
      </div>
      <Alert className="mt-6" tone="info" title="No action is needed yet">The plan can only continue after all three checks return a safe result. GoalGuard will stop safely if any hard constraint fails.</Alert>
    </Card>
  );
}

export function ScenarioTabPanel({ goal, candidate, onOpenPlan }: { goal: Goal | null; candidate: PublicProtectionCandidate | null; onOpenPlan: () => void }) {
  if (!goal || !candidate) {
    return (
      <Card className="p-6 sm:p-9">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--surface-muted)] text-[color:var(--foreground-soft)]">
            <ShieldCheck className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">Scenario view</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em]">Scenarios appear with a live plan.</h2>
            <p className="mt-3 max-w-2xl leading-6 text-[color:var(--foreground-soft)]">After a candidate is found, this view shows how the protected value changes when ETH moves down, stays flat, or moves up.</p>
            <Button className="mt-6" variant="secondary" onClick={onOpenPlan}>Open your plan <ArrowRight aria-hidden="true" /></Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <section aria-labelledby="workspace-scenarios-title" className="grid gap-5">
      <Card className="p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">Scenario view · {goalName(goal)}</p>
            <h2 id="workspace-scenarios-title" className="mt-2 text-3xl font-semibold tracking-[-0.05em]">What the protection changes</h2>
            <p className="mt-3 max-w-2xl leading-6 text-[color:var(--foreground-soft)]">These are estimated outcomes from the selected quote. They explain the safety trade-off; they are not a promise about future ETH prices.</p>
          </div>
          <StatusBadge tone={candidate.settlementType === "physical" ? "warning" : "info"} label={candidate.settlementType === "physical" ? "Asset-delivery settlement" : "Cash settlement"} />
        </div>
        <div className="metric-grid mt-6">
          <MetricCard label="Goal amount" value={formatUsd(goal.protectedValueUsd)} />
          <MetricCard label="Protection cost" value={formatUsd(candidate.premiumUsd)} tone="accent" />
          <MetricCard label="Estimated floor" value={formatUsd(candidate.estimatedFloorUsd)} tone="accent" />
          <MetricCard label="Coverage" value={formatPercentFromBps(candidate.goalCoverageBps)} />
        </div>
      </Card>

      <Card className="p-5 sm:p-8">
        <div className="flex items-start gap-3">
          <ChartLine className="mt-0.5 size-5 shrink-0 text-[color:var(--accent)]" aria-hidden="true" />
          <div>
            <h3 className="font-semibold tracking-[-0.02em]">Estimated net value after cost</h3>
            <p className="mt-1 text-sm leading-6 text-[color:var(--foreground-soft)]">The flat case is the current reference. Downside protection is shown as the option payoff plus the value of the covered ETH, after the premium.</p>
          </div>
        </div>
        <div className="mt-7"><ScenarioComparison scenarios={candidate.scenarios} settlementType={candidate.settlementType} strikeUsd={candidate.strikeUsd} /></div>
        <Alert className="mt-7" tone={candidate.settlementType === "physical" ? "warning" : "info"} title="Read the settlement condition">
          {candidate.settlementType === "physical"
            ? "A downside outcome may deliver a USD-linked settlement asset instead of a cash top-up. Review the physical-settlement disclosure before continuing."
            : "A downside outcome is designed to add a cash top-up while you keep your ETH, subject to the displayed expiry and settlement rules."}
        </Alert>
      </Card>
    </section>
  );
}

export function AuditTabPanel({ goal, candidate, decision, trade, stale, onOpenPlan }: { goal: Goal | null; candidate: PublicProtectionCandidate | null; decision: CouncilDecision | null; trade: Trade | null; stale: boolean; onOpenPlan: () => void }) {
  if (!decision) {
    return (
      <Card className="p-6 sm:p-9">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--surface-muted)] text-[color:var(--foreground-soft)]">
            <ClipboardText className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">Audit trail</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em]">The council record is not ready yet.</h2>
            <p className="mt-3 max-w-2xl leading-6 text-[color:var(--foreground-soft)]">Once the three independent checks finish, GoalGuard keeps their verdicts, models, and request IDs here so you can inspect what happened.</p>
            <Button className="mt-6" variant="secondary" onClick={onOpenPlan}>Open your plan <ArrowRight aria-hidden="true" /></Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <section aria-labelledby="workspace-audit-title" className="grid gap-5">
      <Card className="p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">Audit trail{goal ? ` · ${goalName(goal)}` : ""}</p>
            <h2 id="workspace-audit-title" className="mt-2 text-3xl font-semibold tracking-[-0.05em]">Why this plan has this status</h2>
            <p className="mt-3 max-w-2xl leading-6 text-[color:var(--foreground-soft)]">The council explains its reasoning, while the deterministic strategy engine owns the financial values. Every review below is retained as a traceable record.</p>
          </div>
          <StatusBadge tone={decisionTone(decision)} label={decisionLabel(decision)} />
        </div>

        {stale ? (
          <Alert className="mt-6" tone="warning" title="These results are for an older goal version">
            The goal changed after this review. The record is kept for context, but find live protection again before relying on this plan.
          </Alert>
        ) : null}

        <dl className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[var(--radius-card)] bg-[var(--surface-muted)] p-4"><dt className="text-xs text-[color:var(--foreground-soft)]">Council attempt</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{decision.attempt}</dd></div>
          <div className="rounded-[var(--radius-card)] bg-[var(--surface-muted)] p-4"><dt className="text-xs text-[color:var(--foreground-soft)]">Checks passed</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{decision.approvedReviewCount} of 3</dd></div>
          <div className="rounded-[var(--radius-card)] bg-[var(--surface-muted)] p-4"><dt className="text-xs text-[color:var(--foreground-soft)]">Ruleset</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{decision.rulesetVersion}</dd></div>
          <div className="rounded-[var(--radius-card)] bg-[var(--surface-muted)] p-4"><dt className="text-xs text-[color:var(--foreground-soft)]">Reviewed</dt><dd className="mt-1 text-sm font-semibold tabular-nums">{formatDate(decision.createdAt, { hour: "numeric", minute: "2-digit" })}</dd></div>
        </dl>

        {candidate ? (
          <div className="mt-5 rounded-[var(--radius-card)] border border-[var(--border)] p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">Reviewed candidate</p>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <p><span className="block text-xs text-[color:var(--foreground-soft)]">Cost</span><span className="mt-1 block font-semibold tabular-nums">{formatUsd(candidate.premiumUsd)}</span></p>
              <p><span className="block text-xs text-[color:var(--foreground-soft)]">Estimated floor</span><span className="mt-1 block font-semibold tabular-nums">{formatUsd(candidate.estimatedFloorUsd)}</span></p>
              <p><span className="block text-xs text-[color:var(--foreground-soft)]">Coverage</span><span className="mt-1 block font-semibold tabular-nums">{formatPercentFromBps(candidate.goalCoverageBps)}</span></p>
              <p><span className="block text-xs text-[color:var(--foreground-soft)]">Expires</span><span className="mt-1 block font-semibold tabular-nums">{formatDate(candidate.expiry)}</span></p>
            </div>
          </div>
        ) : null}
      </Card>

      <section aria-labelledby="workspace-review-records-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">Independent records</p><h3 id="workspace-review-records-title" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Three council voices</h3></div>
          <p className="text-xs text-[color:var(--foreground-soft)]">Created {formatDate(decision.createdAt)}</p>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">{decision.reviews.map((review) => <CouncilCard key={review.id} review={review} label={roleLabels[review.role]} />)}</div>
      </section>

      {decision.blockedReasons.length ? <Alert tone={decision.status === "disputed" ? "warning" : "error"} title="Council concern">{decision.blockedReasons.join(" ")}</Alert> : null}

      {trade ? (
        <Card className="p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 size-5 shrink-0 text-[color:var(--accent)]" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">Trade record</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{tradeLabel(trade.status)}</h3>
              <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">This record is read-only. No signing or broadcast action is available from the audit view.</p>
            </div>
            <StatusBadge tone={trade.status === "failed" ? "error" : "info"} label={tradeLabel(trade.status)} />
          </div>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-[color:var(--foreground-soft)]">Trade reference</dt><dd className="overflow-anywhere mt-1 text-xs tabular-nums">{trade.id}</dd></div>
            <div><dt className="text-xs text-[color:var(--foreground-soft)]">Preview expires</dt><dd className="mt-1 tabular-nums">{formatDate(trade.previewExpiresAt, { hour: "numeric", minute: "2-digit" })}</dd></div>
          </dl>
        </Card>
      ) : null}

      <Alert tone="info" title="No hidden actions here">
        <span className="inline-flex items-start gap-2"><WarningCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />The audit view only explains saved facts. Return to Plan when you want to review the guarded next action.</span>
      </Alert>
    </section>
  );
}

function errorDetails(error: WorkflowError) {
  if (!error.details || typeof error.details !== "object" || Array.isArray(error.details)) return [];
  return Object.entries(error.details).slice(0, 4).map(([key, value]) => `${key.replace(/([A-Z])/g, " $1")}: ${typeof value === "string" ? value : JSON.stringify(value)}`);
}

export function InlineWorkflowError({ error, onRetry, onEdit }: { error: WorkflowError; onRetry: () => void; onEdit: () => void }) {
  const editFirst = ["NO_SUITABLE_CANDIDATE", "GOAL_INCOMPLETE"].includes(error.code);
  const details = errorDetails(error);
  return (
    <div className="grid gap-4">
      <Alert tone="error" title="The protection flow stopped safely">
        <p>{error.message}</p>
        {details.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">{details.map((detail) => <li key={detail}>{detail}</li>)}</ul> : null}
        {error.requestId ? <p className="mt-2 overflow-anywhere text-xs tabular-nums">Request {error.requestId}</p> : null}
      </Alert>
      <div className="flex flex-col gap-3 sm:flex-row">
        {error.retryable && !editFirst ? <Button onClick={onRetry}>Try this step again <ArrowRight aria-hidden="true" /></Button> : null}
        <Button variant={editFirst ? "primary" : "secondary"} onClick={onEdit}>Edit goal constraints</Button>
      </div>
    </div>
  );
}
