"use client";

import { ArrowRight } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { NiulaiChatRail, resolveNiulaiChatState, type NiulaiProcessingStage } from "@/components/brand/niulai-chat-rail";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { roleLabels } from "@/components/workflow/workflow-panels";
import { CouncilCard, CouncilRoleProgressCard } from "@/components/workflow/workflow-primitives";
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
  if (decision.status === "approved") return "All three independent checks approved this candidate. Review the deterministic plan facts before continuing.";
  if (decision.status === "disputed") return "The council needs another look before this candidate can continue. Ask for a fresh review or find another live option.";
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

// Right rail: Niu Lai's live presence plus whatever the council currently has to say. Council
// state is read straight from the same poll the workspace already runs -- nothing here is
// simulated, and when there is nothing real to report it says so.
export function CouncilRail({ stage, councilProgress, reviewStartedAt, decision, planStale, onOpenCouncil, goal = null, candidate = null, busy = false, walletStatus = "other", onContinue, onRefresh, onRetryReview }: {
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
    decision && goal && candidate && onContinue && onRefresh && onRetryReview
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
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">Full verdicts</p>
              <div className="mt-3 grid gap-3">
                {decision.reviews.map((review) => <CouncilCard key={review.id} review={review} label={roleLabels[review.role]} />)}
              </div>
            </div>
            <Alert className="mt-5" tone={decision.status === "approved" ? "success" : decision.status === "disputed" ? "warning" : "error"} title={`Council result: ${decision.status}`}>
              {consensusCopy(decision)}
            </Alert>
            {showPlanActions && decision && onContinue && onRefresh && onRetryReview ? (
              <PlanRailActions decision={decision} busy={busy} walletStatus={walletStatus} onContinue={onContinue} onRefresh={onRefresh} onRetryReview={onRetryReview} />
            ) : <Button variant="secondary" className="mt-3 w-full" onClick={onOpenCouncil}>Open full review</Button>}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-soft)]">
            Three Gonka reviewers check plan fit, downside risk, and clarity once a live option is found.
          </p>
        )}
      </section>
    </div>
  );
}
