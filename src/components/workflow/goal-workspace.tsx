"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressSteps } from "@/components/ui/progress-steps";
import { Skeleton } from "@/components/ui/skeleton";
import { WalletControl } from "@/components/wallet/wallet-control";
import { useWallet } from "@/components/wallet/wallet-provider";
import {
  CouncilDrawer,
  GoalConfirmationForm,
  ProtectionPlanPanel,
  UnsignedPreviewPanel,
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

export function GoalWorkspace({ goalId }: { goalId: string }) {
  const router = useRouter();
  const wallet = useWallet();
  const [state, dispatch] = useReducer(workflowReducer, initialWorkflowState);
  const [hydrating, setHydrating] = useState(true);
  const [busy, setBusy] = useState(false);
  const [councilOpen, setCouncilOpen] = useState(false);
  const stageHeading = useRef<HTMLDivElement>(null);
  const previewWallet = useRef<string | null>(null);

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
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [hydrate]);

  useEffect(() => {
    if (!hydrating) stageHeading.current?.focus();
  }, [hydrating, state.stage]);

  useEffect(() => {
    if (!state.preview || !previewWallet.current) return;
    if (wallet.address !== previewWallet.current || wallet.chainId !== 8453) {
      fail(new ApiClientError("The wallet or network changed. Request a fresh preview before continuing.", "WRONG_NETWORK", true), "plan_approved");
      previewWallet.current = null;
    }
  }, [fail, state.preview, wallet.address, wallet.chainId]);

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
      if (!selected) throw new ApiClientError("The live market response did not contain a valid selected candidate.", "UPSTREAM_INVALID_RESPONSE", true);
      dispatch({ type: "candidates_found", goal: candidateResponse.data.goal, candidates: candidateResponse.data.candidates, selected });
      dispatch({ type: "review_started" });
      const review = await goalGuardApi.reviewCandidate({ goalId, candidateId: selected.id });
      dispatch({ type: "review_completed", goal: review.data.goal, candidate: review.data.candidate, decision: review.data.decision });
    } catch (reason) {
      const code = reason instanceof ApiClientError ? reason.code : "INTERNAL_ERROR";
      fail(reason, code === "NO_SUITABLE_CANDIDATE" || code === "GOAL_INCOMPLETE" ? "confirming_goal" : state.selectedCandidate ? "plan_approved" : "confirming_goal");
    } finally { setBusy(false); }
  }, [fail, goalId, state.goal, state.selectedCandidate]);

  const retryReview = useCallback(async (forceNewAttempt = true) => {
    if (!state.selectedCandidate) return;
    setBusy(true);
    dispatch({ type: "review_started" });
    try {
      const review = await goalGuardApi.reviewCandidate({ goalId, candidateId: state.selectedCandidate.id, forceNewAttempt });
      dispatch({ type: "review_completed", goal: review.data.goal, candidate: review.data.candidate, decision: review.data.decision });
    } catch (reason) { fail(reason, "plan_approved"); }
    finally { setBusy(false); }
  }, [fail, goalId, state.selectedCandidate]);

  const previewTrade = useCallback(async () => {
    if (wallet.status === "wrong-network") return;
    if (wallet.status !== "connected" || !wallet.address) { await wallet.connect(); return; }
    if (!state.goal || !state.selectedCandidate || state.decision?.status !== "approved") return;
    setBusy(true);
    dispatch({ type: "preview_started" });
    try {
      const previous = readPreviewRetry();
      const previewIdentity = { goalId: state.goal.id, candidateId: state.selectedCandidate.id, councilDecisionId: state.decision.id, walletAddress: wallet.address };
      const idempotencyKey = previous && previous.goalId === previewIdentity.goalId && previous.candidateId === previewIdentity.candidateId && previous.councilDecisionId === previewIdentity.councilDecisionId && previous.walletAddress.toLowerCase() === previewIdentity.walletAddress.toLowerCase() ? previous.idempotencyKey : crypto.randomUUID();
      savePreviewRetry({ ...previewIdentity, idempotencyKey });
      const response = await goalGuardApi.previewTrade({
        goalId: state.goal.id,
        candidateId: state.selectedCandidate.id,
        councilDecisionId: state.decision.id,
        walletAddress: wallet.address,
      }, idempotencyKey);
      clearPreviewRetry();
      previewWallet.current = wallet.address;
      dispatch({ type: "preview_ready", preview: response.data });
    } catch (reason) { fail(reason, "plan_approved"); }
    finally { setBusy(false); }
  }, [fail, state.decision, state.goal, state.selectedCandidate, wallet]);

  async function retryCurrent() {
    if (state.error?.code === "CANDIDATE_STALE") { await findAndReview(undefined, true); return; }
    if (state.error?.code === "QUOTE_EXPIRED") { await previewTrade(); return; }
    if (state.error?.code === "GONKA_UNAVAILABLE" && state.selectedCandidate) { await retryReview(true); return; }
    dispatch({ type: "clear_error" });
  }

  function startAgain() {
    window.localStorage.removeItem(storageKeys.activeGoalId);
    router.push("/");
  }

  const planReady = state.goal && state.selectedCandidate && state.decision;
  const renderContent = () => {
    if (hydrating) return <Card className="p-7"><Skeleton className="h-8 w-56" /><Skeleton className="mt-5 h-64" /></Card>;
    if (state.stage === "recoverable_error" || state.stage === "terminal_error") {
      return <Card className="mx-auto max-w-2xl p-7 sm:p-9"><Alert tone="error" title={state.error?.code === "NO_SUITABLE_CANDIDATE" ? "No suitable live option" : "This step could not finish"}>{state.error?.message ?? "GoalGuard needs your attention."}{state.error?.requestId ? <span className="mt-2 block font-mono text-xs">Request {state.error.requestId}</span> : null}</Alert><div className="mt-6 flex flex-wrap gap-3">{state.error?.retryable ? <Button onClick={() => void retryCurrent()} disabled={busy}>{busy ? "Retrying…" : "Retry safely"}</Button> : null}{state.goal ? <Button variant="secondary" onClick={() => dispatch({ type: "clear_error" })}>Return to saved goal</Button> : null}<Button variant="ghost" onClick={startAgain}>Start again</Button></div></Card>;
    }
    if (state.stage === "searching_candidates" || state.stage === "reviewing_candidate") return <Card className="mx-auto max-w-2xl p-8"><ProgressSteps active={state.stage === "searching_candidates" ? "market" : "review"} /><p className="mt-7 text-sm text-[var(--muted)]">This progress follows the active backend request. GoalGuard does not simulate completion.</p></Card>;
    if (state.stage === "confirming_goal" && state.goal) return <GoalConfirmationForm goal={state.goal} busy={busy} fieldErrors={state.error?.fieldErrors ?? {}} onSave={saveGoal} onFind={(value) => findAndReview(value)} />;
    if (["plan_approved", "plan_disputed", "plan_blocked"].includes(state.stage) && planReady) return <ProtectionPlanPanel goal={state.goal!} candidate={state.selectedCandidate!} alternatives={state.candidates.filter((candidate) => candidate.id !== state.selectedCandidate!.id)} decision={state.decision!} busy={busy} onOpenCouncil={() => setCouncilOpen(true)} onRefresh={() => void findAndReview(undefined, true)} onPreview={() => void previewTrade()} />;
    if (state.stage === "previewing_trade") return <Card className="mx-auto max-w-2xl p-8"><ProgressSteps active="review" /><p className="mt-6 text-sm text-[var(--muted)]">Revalidating the live quote and constructing an unsigned preview…</p></Card>;
    if (state.stage === "preview_ready" && state.preview) return <UnsignedPreviewPanel preview={state.preview} walletAddress={wallet.address} onBack={() => dispatch({ type: "review_completed", goal: state.goal!, candidate: state.selectedCandidate!, decision: state.decision! })} />;
    return <EmptyState title="Goal state unavailable">GoalGuard could not map this saved record to a safe frontend state.<div className="mt-5"><Button onClick={() => void hydrate()}>Reload saved goal</Button></div></EmptyState>;
  };

  return (
    <main className="min-h-screen overflow-hidden">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-5 pb-16 sm:px-8 lg:px-10">
        <header className="flex min-h-24 items-start justify-between gap-6 py-6 sm:items-center">
          <Link href="/" className="flex items-center gap-3 text-white" aria-label="GoalGuard home"><span className="grid size-10 place-items-center rounded-xl border border-[#cbff6b]/25 bg-[#cbff6b]/10"><span className="shield-mark" aria-hidden="true" /></span><span><span className="block text-base font-bold">GoalGuard</span><span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#829289]">Goal workspace</span></span></Link>
          <WalletControl />
        </header>
        <div ref={stageHeading} tabIndex={-1} className="outline-none" aria-live="polite">{renderContent()}</div>
        {state.notice ? <Alert className="mx-auto mt-5 max-w-2xl">{state.notice}</Alert> : null}
        {state.decision ? <CouncilDrawer decision={state.decision} open={councilOpen} onClose={() => setCouncilOpen(false)} /> : null}
      </div>
    </main>
  );
}
