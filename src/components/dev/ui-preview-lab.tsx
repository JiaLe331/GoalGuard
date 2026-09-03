"use client";

import { ArrowLeft, ArrowRight, ShieldCheck } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FloatingEditorialNavbar } from "@/components/navigation/floating-editorial-navbar";
import {
  ActiveProtectionPanel,
  CouncilDrawer,
  DemoPreviewReadyPanel,
  GoalConfirmationForm,
  PreviewConfirmationPanel,
  ProtectionPlanPanel,
  WorkflowErrorPanel,
} from "@/components/workflow/workflow-panels";
import { StageShell } from "@/components/workflow/workflow-primitives";
import type { ApiMeta, CouncilDecision, Goal, PublicProtectionCandidate, TradePreview, UpdateGoalRequest } from "@/lib/contracts";
import { parseUiPreviewState, type UiPreviewState, uiPreviewStates } from "@/lib/frontend/ui-preview";
import type { WorkflowError } from "@/lib/frontend/workflow";

export interface UiPreviewSamples {
  goal: Goal;
  candidate: PublicProtectionCandidate;
  decision: CouncilDecision;
  disputedDecision: CouncilDecision;
  blockedDecision: CouncilDecision;
  preview: TradePreview;
  meta: ApiMeta;
}

const previewWallet = "0x1111111111111111111111111111111111111111";

const errors: Record<"no-candidate" | "stale-candidate" | "preview-failure", WorkflowError> = {
  "no-candidate": {
    code: "NO_SUITABLE_CANDIDATE",
    message: "No live option met every protection limit. Nothing was selected or previewed.",
    retryable: true,
    requestId: "preview-sample-no-candidate",
    fieldErrors: {},
    details: {
      rejected: [
        "Premium exceeded the maximum protection cost.",
        "Available quantity could not cover the full goal.",
        "Expiry fell outside the allowed deadline gap.",
      ],
    },
    returnStage: "confirming_goal",
  },
  "stale-candidate": {
    code: "CANDIDATE_STALE",
    message: "The selected option changed after review. Recheck live options before confirming a new preview.",
    retryable: true,
    requestId: "preview-sample-stale-candidate",
    fieldErrors: {},
    details: { marketFact: "The quote fingerprint no longer matches the reviewed candidate." },
    returnStage: "plan_approved",
  },
  "preview-failure": {
    code: "PREVIEW_FAILED",
    message: "The unsigned transaction preview could not be generated. No wallet action was requested.",
    retryable: true,
    requestId: "preview-sample-preview-failure",
    fieldErrors: {},
    details: { safeOutcome: "Acknowledgment was reset and no transaction data was retained." },
    returnStage: "plan_approved",
  },
};

function stageFrame(state: UiPreviewState) {
  if (state === "goal-confirmation") return { step: 1, title: "Confirm your goal", eyebrow: "Define goal" };
  if (["searching", "no-candidate"].includes(state)) return { step: 2, title: "Find live protection", eyebrow: "Live options" };
  if (["reviewing", "plan-approved", "plan-disputed", "plan-blocked", "council-drawer", "stale-candidate", "reload-after-preview"].includes(state)) return { step: 3, title: "Review the plan", eyebrow: "Council review" };
  if (["preview-confirmation", "generating-preview", "preview-failure"].includes(state)) return { step: 4, title: "Confirm the unsigned preview", eyebrow: "Confirm preview" };
  return { step: 5, title: "Inspect the demo result", eyebrow: "Demo ready" };
}

export function UiPreviewLab({ initialState, samples }: { initialState: UiPreviewState; samples: UiPreviewSamples }) {
  const [state, setState] = useState(initialState);
  const [goal, setGoal] = useState(samples.goal);
  const [acknowledged, setAcknowledged] = useState(false);
  const [saved, setSaved] = useState(false);
  const [councilOpen, setCouncilOpen] = useState(initialState === "council-drawer");
  const frame = stageFrame(state);
  const stateIndex = uiPreviewStates.findIndex((item) => item.value === state);

  const insufficientPreview = useMemo<TradePreview>(() => ({
    ...samples.preview,
    walletReadiness: {
      ...samples.preview.walletReadiness,
      gas: {
        ...samples.preview.walletReadiness.gas,
        balanceBaseUnits: "0",
        sufficient: false,
      },
      settlementToken: {
        ...samples.preview.walletReadiness.settlementToken,
        balanceBaseUnits: "1000000",
        sufficient: false,
      },
    },
    warnings: ["This wallet does not currently meet the gas and settlement-token requirements."],
  }), [samples.preview]);

  const selectState = useCallback((next: UiPreviewState) => {
    setState(next);
    setAcknowledged(false);
    setSaved(false);
    setCouncilOpen(next === "council-drawer");
    const url = new URL(window.location.href);
    url.searchParams.set("state", next);
    window.history.replaceState(window.history.state, "", url);
  }, []);

  useEffect(() => {
    const onPopState = () => selectState(parseUiPreviewState(new URL(window.location.href).searchParams.get("state") ?? undefined));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [selectState]);

  function updateGoal(value: UpdateGoalRequest) {
    setGoal((current) => ({ ...current, ...value, updatedAt: new Date().toISOString() }));
  }

  function renderSelectedState() {
    if (state === "goal-confirmation") {
      return (
        <>
          {saved ? <Alert className="mb-4" tone="success" title="Sample goal saved">The edited values are held in memory for this preview tab only.</Alert> : null}
          <GoalConfirmationForm
            key={goal.updatedAt}
            goal={goal}
            busy={false}
            fieldErrors={{}}
            onSave={(value) => { updateGoal(value); setSaved(true); }}
            onFind={(value) => { updateGoal(value); selectState("searching"); }}
          />
        </>
      );
    }
    if (state === "searching") return <ActiveProtectionPanel stage="searching_candidates" />;
    if (state === "reviewing") return <ActiveProtectionPanel stage="reviewing_candidate" />;
    if (["plan-approved", "plan-disputed", "plan-blocked", "council-drawer", "reload-after-preview"].includes(state)) {
      const decision = state === "plan-disputed" ? samples.disputedDecision : state === "plan-blocked" ? samples.blockedDecision : samples.decision;
      return (
        <>
          {state === "reload-after-preview" ? (
            <Alert className="mb-4" tone="warning" title="Fresh unsigned preview required">
              Unsigned calldata is never restored from browser storage. The authoritative goal is shown at its approved plan so you can review and confirm again.
            </Alert>
          ) : null}
          <ProtectionPlanPanel
            goal={goal}
            candidate={samples.candidate}
            alternatives={[]}
            decision={decision}
            busy={false}
            walletStatus="connected"
            onContinue={() => selectState("preview-confirmation")}
            onRefresh={() => selectState("searching")}
            onOpenCouncil={() => { setCouncilOpen(true); selectState("council-drawer"); }}
          />
          <CouncilDrawer decision={decision} open={councilOpen} onClose={() => { setCouncilOpen(false); selectState("plan-approved"); }} />
        </>
      );
    }
    if (state === "preview-confirmation") {
      return (
        <PreviewConfirmationPanel
          goal={goal}
          candidate={samples.candidate}
          walletAddress={previewWallet}
          acknowledged={acknowledged}
          busy={false}
          onAcknowledged={setAcknowledged}
          onBack={() => selectState("plan-approved")}
          onGenerate={() => { if (acknowledged) selectState("generating-preview"); }}
        />
      );
    }
    if (state === "generating-preview") return <ActiveProtectionPanel stage="generating_preview" />;
    if (state === "demo-ready" || state === "insufficient-wallet") {
      return (
        <DemoPreviewReadyPanel
          goal={goal}
          preview={state === "insufficient-wallet" ? insufficientPreview : samples.preview}
          meta={samples.meta}
          decision={samples.decision}
          onStartAnother={() => selectState("goal-confirmation")}
          onFreshPreview={() => selectState("plan-approved")}
        />
      );
    }
    const error = errors[state as keyof typeof errors];
    return <WorkflowErrorPanel error={error} onRetry={() => selectState(error.returnStage === "confirming_goal" ? "goal-confirmation" : "plan-approved")} onEdit={() => selectState("goal-confirmation")} />;
  }

  return (
    <>
      <a href="#preview-content" className="skip-link">Skip to previewed interface</a>
      <FloatingEditorialNavbar variant="workflow" contextLabel={`${frame.eyebrow} · ${frame.title}`} statusLabel="Local interface lab" walletSlot={<span className="hidden min-h-11 items-center rounded-full bg-[var(--accent-soft)] px-4 text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--accent-soft-foreground)] min-[520px]:inline-flex">Sample data</span>} />

      <main id="preview-content" tabIndex={-1} className="min-h-screen outline-none">
        <div className="reading-shell pt-6 sm:pt-8">
          <Alert tone="warning" title="Development UI preview — sample data">
            Production panels are running with canonical local fixtures. Controls stay in this tab: no API, wallet, storage, signature, or broadcast request is made.
          </Alert>
          <div className="mt-4 grid gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-raised)] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label htmlFor="preview-state" className="grid gap-2 text-sm font-semibold">
              Interface state
              <select
                id="preview-state"
                className="field-control"
                value={state}
                onChange={(event) => selectState(event.target.value as UiPreviewState)}
              >
                {uiPreviewStates.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <div className="flex flex-wrap gap-2" aria-label="Preview state navigation">
              <Button variant="secondary" className="px-4" disabled={stateIndex === 0} onClick={() => selectState(uiPreviewStates[stateIndex - 1]?.value ?? state)}><ArrowLeft aria-hidden="true" />Previous</Button>
              <Button variant="secondary" className="px-4" disabled={stateIndex === uiPreviewStates.length - 1} onClick={() => selectState(uiPreviewStates[stateIndex + 1]?.value ?? state)}>Next<ArrowRight aria-hidden="true" /></Button>
            </div>
          </div>
        </div>

        <StageShell step={frame.step} title={frame.title} eyebrow={frame.eyebrow}>
          {renderSelectedState()}
        </StageShell>

        <footer className="reading-shell pb-10 text-center text-xs text-[color:var(--foreground-soft)]">
          <ShieldCheck className="mr-1 inline size-4" aria-hidden="true" />Development only · unsigned preview boundary preserved
        </footer>
      </main>
    </>
  );
}
