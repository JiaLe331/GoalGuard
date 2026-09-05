"use client";

import { ArrowRight } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { NiulaiChatRail, resolveNiulaiChatState, type NiulaiProcessingStage } from "@/components/brand/niulai-chat-rail";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { roleLabels } from "@/components/workflow/workflow-panels";
import { CouncilRoleProgressCard } from "@/components/workflow/workflow-primitives";
import type { CouncilDecision, CouncilRoleProgress, Goal, PublicProtectionCandidate } from "@/lib/contracts";
import type { WorkflowStage } from "@/lib/frontend/workflow";

const processingStages: Partial<Record<WorkflowStage, NiulaiProcessingStage>> = {
  searching_candidates: "checking-options",
  reviewing_candidate: "council-review",
  generating_preview: "reading-goal",
};

type WalletStatus = "connected" | "wrong-network" | "other";

function planActionLabel(walletStatus: WalletStatus) {
  if (walletStatus === "wrong-network") return "Switch to Base";
  if (walletStatus === "connected") return "Continue to unsigned preview";
  return "Connect wallet to continue";
}

function consensusCopy(decision: CouncilDecision) {
  if (decision.status === "approved") {
    return decision.blockedReasons.length
      ? `${decision.approvedReviewCount} of 3 independent checks approved this candidate. The remaining reviewer's concern stays attached to the plan and is kept in the audit trail.`
      : "All three independent checks approved this candidate. Review the deterministic plan facts before continuing.";
  }
  // Surface the actual concern, not just the label. The rail is the only council output visible
  // on the Market, Plan and Scenarios tabs, so "disputed" without a reason is not much of an answer.
  if (decision.status === "disputed") return decision.blockedReasons[0] ?? "The council needs another look before this candidate can continue.";
  return decision.blockedReasons[0] ?? "The council found a hard stop. Read the saved verdicts before finding another live option.";
}

function PlanRailActions({ decision, busy, walletStatus, onContinue, onRefresh, onRetryReview }: {
  decision: CouncilDecision;
  busy: boolean;
  walletStatus: WalletStatus;
  onContinue: () => void;
  onRefresh: () => void;
  onRetryReview: () => void;
}) {
  const approved = decision.status === "approved";
  return (
    <section aria-labelledby="council-next-step" className="mt-5 rounded-[var(--radius-card)] bg-[var(--surface-raised)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">Next safe step</p>
      <h3 id="council-next-step" className="mt-2 text-lg font-semibold tracking-[-0.03em]">{approved ? "Review an unsigned preview" : "Resolve the council result"}</h3>
      <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">{approved ? "The preview is read-only and does not sign or broadcast a transaction." : "No preview can be generated until the council result is safe to continue."}</p>
      <div className="mt-4 grid gap-2">
        <Button onClick={onContinue} disabled={!approved || busy}>{approved ? planActionLabel(walletStatus) : "Plan cannot continue"}<ArrowRight aria-hidden="true" /></Button>
        {decision.status === "disputed" ? <Button variant="secondary" onClick={onRetryReview} disabled={busy}>Ask the council to re-review</Button> : null}
        <Button variant="ghost" onClick={onRefresh} disabled={busy}>Refresh live options</Button>
      </div>
    </section>
  );
}

// Named roles rather than a sentence about "three reviewers": the council is a headline feature,
// and before a review runs the rail is the only place that says who actually does the checking.
const idleRoster = [
  { role: "strategist", job: "Does this option fit the stated goal?" },
  { role: "risk_auditor", job: "What breaks in the downside case?" },
  { role: "consumer_advocate", job: "Is the trade-off stated plainly?" },
] as const;

function IdleCouncilRoster() {
  return (
    <div className="mt-3">
      <ul className="grid gap-2">
        {idleRoster.map((entry) => (
          <li key={entry.role} className="rounded-[var(--radius-card)] bg-[var(--surface-subtle)] p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-sm font-semibold">{roleLabels[entry.role]}</p>
              <span className="size-2 shrink-0 rounded-full bg-[var(--border-strong)]" aria-hidden="true" />
            </div>
            <p className="mt-1 text-xs leading-5 text-[color:var(--foreground-soft)]">{entry.job}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-5 text-[color:var(--foreground-soft)]">
        Three independent Gonka reviews run on every candidate. Each verdict is saved with its model and request ID.
      </p>
    </div>
  );
}

const verdictPresentation = {
  approve: { tone: "ready", label: "Approve" },
  uncertain: { tone: "warning", label: "Uncertain" },
  reject: { tone: "error", label: "Reject" },
} as const;

/**
 * The decided rail is the same three rows as the idle roster, now carrying verdicts.
 *
 * Deliberately a summary, not the verdicts themselves: the Audit tab already prints every
 * review in full, and the rail sits beside it on screen. Repeating the reasoning in both places
 * made the same three paragraphs appear twice at once. The full text stays one click away.
 */
function DecidedCouncilRoster({ decision }: { decision: CouncilDecision }) {
  return (
    <ul className="mt-3 grid gap-2">
      {decision.reviews.map((review) => {
        const verdict = verdictPresentation[review.verdict];
        return (
          <li key={review.id} className="flex items-center justify-between gap-2 rounded-[var(--radius-card)] bg-[var(--surface-subtle)] p-3">
            <p className="min-w-0 truncate text-sm font-semibold">{roleLabels[review.role]}</p>
            <StatusBadge tone={verdict.tone} label={verdict.label} />
          </li>
        );
      })}
    </ul>
  );
}

// Right rail: Niu Lai's live presence plus whatever the council currently has to say. Council
// state is read straight from the same poll the workspace already runs -- nothing here is
// simulated, and when there is nothing real to report it says so.
export function CouncilRail({ stage, councilProgress, reviewStartedAt, decision, planStale, onOpenCouncil, goal = null, candidate = null, busy = false, walletStatus = "other", readOnly = false, onContinue, onRefresh, onRetryReview }: {
  stage: WorkflowStage;
  councilProgress: CouncilRoleProgress[] | null;
  reviewStartedAt: number | null;
  decision: CouncilDecision | null;
  planStale: boolean;
  onOpenCouncil: () => void;
  goal?: Goal | null;
  candidate?: PublicProtectionCandidate | null;
  busy?: boolean;
  walletStatus?: WalletStatus;
  /** The shared demo goal: readable by anyone, writable by nobody but its author. */
  readOnly?: boolean;
  onContinue?: () => void;
  onRefresh?: () => void;
  onRetryReview?: () => void;
}) {
  const running = councilProgress?.find((role) => role.status === "running") ?? null;
  const runningRole = running?.role ?? null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!runningRole) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [runningRole]);
  const startMs = running ? (running.startedAt ? Date.parse(running.startedAt) : reviewStartedAt) : null;
  const elapsedSeconds = startMs !== null ? Math.max(0, Math.round((now - startMs) / 1000)) : null;

  const mascotState = resolveNiulaiChatState({
    hasError: stage === "terminal_error" || stage === "recoverable_error" || stage === "plan_blocked",
    ready: stage === "plan_approved" || stage === "demo_preview_ready",
    clarifying: stage === "plan_disputed",
    processing: stage in processingStages,
  });
  const showPlanActions = Boolean(
    !readOnly && decision && goal && candidate && onContinue && onRefresh && onRetryReview
      && ["plan_approved", "plan_disputed", "plan_blocked"].includes(stage),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[var(--radius-card)] bg-[var(--surface-subtle)] p-3">
        <NiulaiChatRail state={mascotState} processingStage={processingStages[stage]} />
      </div>

      <section aria-label="AI Council">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">AI Council</p>

        {councilProgress ? (
          <div className="mt-3 grid gap-3">
            {councilProgress.map((progress) => (
              <CouncilRoleProgressCard
                key={progress.role}
                progress={progress}
                label={roleLabels[progress.role]}
                elapsedSeconds={progress.status === "running" ? elapsedSeconds : null}
                compact
              />
            ))}
          </div>
        ) : decision ? (
          <div className="mt-3">
            {planStale ? (
              <Alert className="mb-3" tone="warning" title="Results are out of date">
                These verdicts describe a previous version of this goal. Find live protection again to get a current review.
              </Alert>
            ) : null}
            <DecidedCouncilRoster decision={decision} />
            <Alert className="mt-5" tone={decision.status === "approved" ? "success" : decision.status === "disputed" ? "warning" : "error"} title={`Council result: ${decision.status}`}>
              {consensusCopy(decision)}
            </Alert>
            {showPlanActions && decision && onContinue && onRefresh && onRetryReview ? (
              <PlanRailActions decision={decision} busy={busy} walletStatus={walletStatus} onContinue={onContinue} onRefresh={onRefresh} onRetryReview={onRetryReview} />
            ) : (
              <>
                {readOnly ? (
                  <p className="mt-4 text-xs leading-5 text-[color:var(--foreground-soft)]">
                    This is a shared example goal, so it is read-only here. Start your own goal to run a live review.
                  </p>
                ) : null}
                <Button variant="secondary" className="mt-3 w-full" onClick={onOpenCouncil}>Open full review</Button>
              </>
            )}
          </div>
        ) : (
          <IdleCouncilRoster />
        )}
      </section>
    </div>
  );
}
