"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { FloatingEditorialNavbar } from "@/components/navigation/floating-editorial-navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WalletControl } from "@/components/wallet/wallet-control";
import { useWallet } from "@/components/wallet/wallet-provider";
import { StageShell } from "@/components/workflow/workflow-primitives";
import {
  ActiveProtectionPanel,
  CouncilDrawer,
  DemoPreviewReadyPanel,
  GoalConfirmationForm,
  PreviewConfirmationPanel,
  ProtectionPlanPanel,
  ReadOnlyTradePanel,
  WorkflowErrorPanel,
} from "@/components/workflow/workflow-panels";
import type { UpdateGoalRequest } from "@/lib/contracts";
import { ApiClientError, goalGuardApi } from "@/lib/frontend/api-client";
import {
  clearPreviewRetry,
  readActiveGoalId,
  readPreviewRetry,
  savePreviewRetry,
  storageKeys,
} from "@/lib/frontend/storage";
import {
  initialWorkflowState,
  workflowError,
  workflowReducer,
  type WorkflowStage,
} from "@/lib/frontend/workflow";

function stagePresentation(stage: WorkflowStage) {
  if (stage === "confirming_goal" || stage === "new_goal") return { step: 1, eyebrow: "Define goal", title: "Confirm your purpose and limits" };
  if (stage === "searching_candidates") return { step: 2, eyebrow: "Live options", title: "Checking live protection" };
  if (stage === "reviewing_candidate") return { step: 3, eyebrow: "Council review", title: "Running three independent checks" };
  if (["plan_approved", "plan_disputed", "plan_blocked"].includes(stage)) return { step: 3, eyebrow: "Council review", title: "Review your protection plan" };
  if (["confirming_preview", "generating_preview"].includes(stage)) return { step: 4, eyebrow: "Confirm preview", title: "Confirm the unsigned preview" };
  if (["demo_preview_ready", "read_only_trade"].includes(stage)) return { step: 5, eyebrow: "Demo ready", title: "Protection plan demo ready" };
  return { step: 1, eyebrow: "Safe stop", title: "GoalGuard needs your attention" };
}

export function GoalWorkspace({ goalId }: { goalId: string }) {
  const router = useRouter();
  const wallet = useWallet();
  const [state, dispatch] = useReducer(workflowReducer, initialWorkflowState);
  const [hydrating, setHydrating] = useState(true);
  const [busy, setBusy] = useState(false);
  const [councilOpen, setCouncilOpen] = useState(false);
  const focusTarget = useRef<HTMLDivElement>(null);
  const previewWallet = useRef<string | null>(null);
  const previewRequest = useRef<AbortController | null>(null);

  const fail = useCallback((reason: unknown, returnStage: WorkflowStage) => {
    dispatch({ type: "error", error: workflowError(reason, returnStage) });
  }, []);

  const hydrate = useCallback(async (signal?: AbortSignal) => {
    if (readActiveGoalId() !== goalId) {
      fail(new ApiClientError("This goal is not available in this browser.", "NOT_FOUND", false), "new_goal");
      setHydrating(false);
      return;
    }
    try {
      const response = await goalGuardApi.getGoal(goalId, signal);
      dispatch({ type: "hydrate", response });
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      fail(reason, "confirming_goal");
    } finally {
      setHydrating(false);
    }
  }, [fail, goalId]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => { void hydrate(controller.signal); }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); previewRequest.current?.abort(); };
  }, [hydrate]);

  useEffect(() => {
    if (!hydrating) focusTarget.current?.focus({ preventScroll: true });
  }, [hydrating, state.stage]);

  useEffect(() => {
    if (!["confirming_preview", "generating_preview", "demo_preview_ready"].includes(state.stage) || !previewWallet.current) return;
    if (wallet.address !== previewWallet.current || wallet.chainId !== 8453) {
      previewRequest.current?.abort();
      clearPreviewRetry();
      previewWallet.current = null;
      dispatch({ type: "preview_invalidated", notice: "The connected wallet or network changed. Review the plan and confirm a fresh unsigned preview." });
      setBusy(false);
    }
  }, [state.stage, wallet.address, wallet.chainId]);

  const saveGoal = useCallback(async (value: UpdateGoalRequest) => {
    setBusy(true);
    try {
      const response = await goalGuardApi.updateGoal(goalId, value);
      dispatch({ type: "goal_updated", goal: response.data.goal });
    } catch (reason) { fail(reason, "confirming_goal"); }
    finally { setBusy(false); }
  }, [fail, goalId]);

  const findAndReview = useCallback(async (value?: UpdateGoalRequest, refresh = false) => {
    setBusy(true);
    try {
      let goal = state.goal;
      if (value) {
        const updated = await goalGuardApi.updateGoal(goalId, value);
        goal = updated.data.goal;
        dispatch({ type: "goal_updated", goal });
      }
      if (!goal) throw new ApiClientError("The goal must be saved before searching.", "GOAL_INCOMPLETE", false);
      dispatch({ type: "search_started" });
      const candidateResponse = await goalGuardApi.generateCandidates({ goalId, refresh });
      const selected = candidateResponse.data.candidates.find((candidate) => candidate.id === candidateResponse.data.selectedCandidateId);
      if (!selected) throw new ApiClientError("No live option safely matched these limits.", "NO_SUITABLE_CANDIDATE", true, {}, candidateResponse.meta.requestId, candidateResponse.data.rejected);
      dispatch({ type: "candidates_found", goal: candidateResponse.data.goal, candidates: candidateResponse.data.candidates, selected });
      dispatch({ type: "review_started" });
      const review = await goalGuardApi.reviewCandidate({ goalId, candidateId: selected.id });
      dispatch({ type: "review_completed", goal: review.data.goal, candidate: review.data.candidate, decision: review.data.decision });
    } catch (reason) {
      const code = reason instanceof ApiClientError ? reason.code : "INTERNAL_ERROR";
      fail(reason, code === "NO_SUITABLE_CANDIDATE" || code === "GOAL_INCOMPLETE" ? "confirming_goal" : state.selectedCandidate ? "plan_approved" : "confirming_goal");
    } finally { setBusy(false); }
  }, [fail, goalId, state.goal, state.selectedCandidate]);

  const retryReview = useCallback(async () => {
    if (!state.selectedCandidate) return;
    setBusy(true);
    dispatch({ type: "review_started" });
    try {
      const review = await goalGuardApi.reviewCandidate({ goalId, candidateId: state.selectedCandidate.id, forceNewAttempt: true });
      dispatch({ type: "review_completed", goal: review.data.goal, candidate: review.data.candidate, decision: review.data.decision });
    } catch (reason) { fail(reason, "plan_approved"); }
    finally { setBusy(false); }
  }, [fail, goalId, state.selectedCandidate]);

  const beginPreview = useCallback(async () => {
    if (wallet.status === "wrong-network") { await wallet.switchToBase(); return; }
    if (wallet.status !== "connected" || !wallet.address) { await wallet.connect(); return; }
    if (!state.goal || !state.selectedCandidate || state.decision?.status !== "approved") return;
    previewWallet.current = wallet.address;
    dispatch({ type: "preview_confirmation_started" });
  }, [state.decision, state.goal, state.selectedCandidate, wallet]);

  const generatePreview = useCallback(async () => {
    const requiresPhysicalAcknowledgment = state.selectedCandidate?.settlementType === "physical";
    if (!state.previewAcknowledged || (requiresPhysicalAcknowledgment && !state.physicalSettlementAcknowledged) || wallet.status !== "connected" || !wallet.address || wallet.chainId !== 8453 || !state.goal || !state.selectedCandidate || state.decision?.status !== "approved") return;
    setBusy(true);
    dispatch({ type: "preview_started" });
    const controller = new AbortController();
    previewRequest.current = controller;
    try {
      const previous = readPreviewRetry();
      const identity = { goalId: state.goal.id, candidateId: state.selectedCandidate.id, councilDecisionId: state.decision.id, walletAddress: wallet.address };
      const idempotencyKey = previous && previous.goalId === identity.goalId && previous.candidateId === identity.candidateId && previous.councilDecisionId === identity.councilDecisionId && previous.walletAddress.toLowerCase() === identity.walletAddress.toLowerCase() ? previous.idempotencyKey : crypto.randomUUID();
      savePreviewRetry({ ...identity, idempotencyKey });
      const response = await goalGuardApi.previewTrade(identity, idempotencyKey, controller.signal);
      clearPreviewRetry();
      dispatch({ type: "preview_ready", response });
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      fail(reason, "plan_approved");
    } finally {
      if (previewRequest.current === controller) previewRequest.current = null;
      setBusy(false);
    }
  }, [fail, state.decision, state.goal, state.previewAcknowledged, state.physicalSettlementAcknowledged, state.selectedCandidate, wallet.address, wallet.chainId, wallet.status]);

  function startAnother() {
    clearPreviewRetry();
    window.localStorage.removeItem(storageKeys.activeGoalId);
    dispatch({ type: "restart" });
    router.push("/");
  }

  const presentation = stagePresentation(state.stage);
  const renderStage = () => {
    if (hydrating) return <Card className="mx-auto max-w-5xl p-6 sm:p-9"><Skeleton className="h-5 w-32" /><Skeleton className="mt-5 h-14 w-3/4" /><div className="mt-8 grid gap-3 sm:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div></Card>;
    if (state.error && ["recoverable_error", "terminal_error"].includes(state.stage)) return <WorkflowErrorPanel error={state.error} onRetry={() => { const target = state.error?.returnStage; dispatch({ type: "clear_error" }); if (target === "plan_approved" && state.selectedCandidate) void retryReview(); }} onEdit={() => { if (state.goal) dispatch({ type: "goal_updated", goal: state.goal }); else router.push("/"); }} />;
    if (state.stage === "confirming_goal" && state.goal) return <GoalConfirmationForm goal={state.goal} busy={busy} fieldErrors={state.error?.fieldErrors ?? {}} onSave={saveGoal} onFind={(value) => void findAndReview(value)} />;
    if (["searching_candidates", "reviewing_candidate", "generating_preview"].includes(state.stage)) return <ActiveProtectionPanel stage={state.stage as "searching_candidates" | "reviewing_candidate" | "generating_preview"} />;
    if (["plan_approved", "plan_disputed", "plan_blocked"].includes(state.stage) && state.goal && state.selectedCandidate && state.decision) return <ProtectionPlanPanel goal={state.goal} candidate={state.selectedCandidate} alternatives={state.candidates.filter((candidate) => candidate.id !== state.selectedCandidate?.id)} decision={state.decision} busy={busy} walletStatus={wallet.status === "connected" ? "connected" : wallet.status === "wrong-network" ? "wrong-network" : "other"} suppressMascot={councilOpen} onContinue={() => void beginPreview()} onRefresh={() => void findAndReview(undefined, true)} onOpenCouncil={() => setCouncilOpen(true)} />;
    if (state.stage === "confirming_preview" && state.goal && state.selectedCandidate && wallet.address) return <PreviewConfirmationPanel goal={state.goal} candidate={state.selectedCandidate} walletAddress={wallet.address} acknowledged={state.previewAcknowledged} physicalSettlementAcknowledged={state.physicalSettlementAcknowledged} busy={busy} onAcknowledged={(acknowledged) => dispatch({ type: "preview_acknowledgment_changed", acknowledged })} onPhysicalSettlementAcknowledged={(acknowledged) => dispatch({ type: "physical_settlement_acknowledgment_changed", acknowledged })} onBack={() => { previewWallet.current = null; dispatch({ type: "preview_confirmation_cancelled" }); }} onGenerate={() => void generatePreview()} />;
    if (state.stage === "demo_preview_ready" && state.goal && state.preview && state.previewMeta && state.decision) return <DemoPreviewReadyPanel goal={state.goal} preview={state.preview} meta={state.previewMeta} decision={state.decision} onStartAnother={startAnother} onFreshPreview={() => dispatch({ type: "preview_invalidated", notice: "The previous preview expired. Confirm a fresh snapshot from the approved plan." })} />;
    if (state.stage === "read_only_trade" && state.goal && state.trade) return <ReadOnlyTradePanel goal={state.goal} trade={state.trade} onStartAnother={startAnother} />;
    return <Card className="mx-auto max-w-2xl p-8 text-center"><h1 className="text-4xl font-semibold tracking-[-0.05em]">Goal not available</h1><p className="mt-3 text-[color:var(--foreground-soft)]">Return home and start a new goal in this browser session.</p><Button className="mt-6" onClick={() => router.push("/")}>Return home</Button></Card>;
  };

  return (
    <main className="min-h-screen bg-[var(--background)] pb-12">
      <a href="#workflow-content" className="skip-link">Skip to current step</a>
      <FloatingEditorialNavbar variant="workflow" contextLabel={`${presentation.eyebrow} · ${presentation.title}`} walletSlot={<WalletControl compact />} />
      <div id="workflow-content" ref={focusTarget} tabIndex={-1} className="outline-none">
        <StageShell {...presentation}>
          {state.notice ? <Alert className="mb-5" tone="info" title="Safety note">{state.notice}</Alert> : null}
          {renderStage()}
        </StageShell>
      </div>
      {state.decision ? <CouncilDrawer decision={state.decision} open={councilOpen} onClose={() => setCouncilOpen(false)} /> : null}
    </main>
  );
}
