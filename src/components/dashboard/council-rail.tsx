"use client";

import { CheckCircle, Question, XCircle } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { NiulaiChatRail, resolveNiulaiChatState, type NiulaiProcessingStage } from "@/components/brand/niulai-chat-rail";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { roleLabels } from "@/components/workflow/workflow-panels";
import { CouncilRoleProgressCard } from "@/components/workflow/workflow-primitives";
import type { CouncilDecision, CouncilRoleProgress } from "@/lib/contracts";
import type { WorkflowStage } from "@/lib/frontend/workflow";

const processingStages: Partial<Record<WorkflowStage, NiulaiProcessingStage>> = {
  searching_candidates: "checking-options",
  reviewing_candidate: "council-review",
  generating_preview: "reading-goal",
};

const verdictIcons = { approve: CheckCircle, uncertain: Question, reject: XCircle } as const;
const verdictColors = { approve: "var(--positive)", uncertain: "var(--accent)", reject: "var(--negative)" } as const;

// Right rail: Niu Lai's live presence plus whatever the council currently has to say. Council
// state is read straight from the same poll the workspace already runs -- nothing here is
// simulated, and when there is nothing real to report it says so.
export function CouncilRail({ stage, councilProgress, reviewStartedAt, decision, planStale, onOpenCouncil }: {
  stage: WorkflowStage;
  councilProgress: CouncilRoleProgress[] | null;
  reviewStartedAt: number | null;
  decision: CouncilDecision | null;
  planStale: boolean;
  onOpenCouncil: () => void;
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
            <ul className="grid gap-2">
              {decision.reviews.map((review) => {
                const Icon = verdictIcons[review.verdict];
                return (
                  <li key={review.id} className="flex min-h-11 items-center gap-3 rounded-[var(--radius-card)] bg-[var(--surface-subtle)] px-3 py-2">
                    <Icon className="size-5 shrink-0" style={{ color: verdictColors[review.verdict] }} weight={review.verdict === "approve" ? "fill" : "regular"} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{roleLabels[review.role]}</span>
                    <span className="shrink-0 text-xs uppercase tracking-[0.1em] text-[color:var(--foreground-soft)]">{review.verdict}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-sm text-[color:var(--foreground-soft)]">{decision.approvedReviewCount} of 3 checks passed · attempt {decision.attempt}</p>
            <Button variant="secondary" className="mt-3 w-full" onClick={onOpenCouncil}>Open full review</Button>
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
