import { councilConsensus } from "@/lib/council/rules";
import { publicCandidate, type CouncilDecision, type CouncilRoleProgress, type ProtectionChainEntry } from "@/lib/contracts";

import {
  capturedCandidate,
  capturedDecision,
  capturedGoal,
  capturedGoalId,
  capturedParseInference,
  capturedSeries,
  capturedSnapshot,
} from "./captured-run";
import { PRESENTATION_WALLET, buildPresentationPreview } from "./preview";

/**
 * Serves one recorded run on a compressed clock.
 *
 * The genuine review took 5m45s across three Gonka roles and can stall upstream, which is
 * not survivable in a 3-minute live slot. This replays the same recorded verdicts against
 * the same schemas, so every component, spinner and progressive reveal behaves exactly as
 * it does against the live API -- only the waiting is shorter.
 */

/** Milliseconds from the start of the review at which each role finishes. */
const ROLE_COMPLETED_AT_MS = [1_500, 3_500, 5_500] as const;
/** The review call itself resolves just after the last role, as the real one does. */
const REVIEW_TOTAL_MS = 6_500;

const STAGE_DELAY_MS = {
  parseGoal: 2_000,
  getGoal: 150,
  updateGoal: 200,
  generateCandidates: 1_500,
  reviewCandidate: REVIEW_TOTAL_MS,
  councilStatus: 60,
  marketSummary: 120,
  previewTrade: 2_000,
} as const;

/** Set when the review begins so the status poll can derive per-role progress from elapsed time. */
let reviewStartedAtMs: number | null = null;
/** Once the review resolves, the goal carries its candidate and decision on rehydrate. */
let reviewCompleted = false;

/** Test seam: lets the unit tests drive the council clock without real waiting. */
export function resetPresentationRun() {
  reviewStartedAtMs = null;
  reviewCompleted = false;
}

const publicCaptured = publicCandidate(capturedCandidate);

/**
 * The captured goal as it looked *before* its review, which is where the flow starts.
 * It was exported mid-review, and hydrating a `reviewing` goal is treated as an interrupted
 * run -- correct for the live app, wrong as an opening state.
 */
const pristineGoal = { ...capturedGoal, status: "draft" as const, selectedCandidateId: null, councilDecisionId: null, tradeId: null };

/** The same goal once the scripted review has completed. */
const reviewedGoal = { ...capturedGoal, status: "ready" as const, selectedCandidateId: capturedCandidate.id, councilDecisionId: capturedDecision.id, tradeId: null };

function meta() {
  return { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() };
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * The recorded verdicts re-scored by the current ruleset. The stored decision predates the
 * two-thirds rule, so replaying its status would show an outcome the code no longer produces.
 */
function decisionUnderCurrentRules(): CouncilDecision {
  const consensus = councilConsensus(capturedDecision.reviews);
  return {
    ...capturedDecision,
    status: consensus.status,
    approvedReviewCount: consensus.approved,
    rejectedReviewCount: consensus.rejected,
    uncertainReviewCount: consensus.uncertain,
    blockedReasons: consensus.blockedReasons,
  };
}

/** Per-role progress for the elapsed point the poll arrives at. */
export function councilProgressAt(elapsedMs: number): CouncilRoleProgress[] {
  const startedAt = reviewStartedAtMs ?? Date.now();
  return capturedDecision.reviews.map((review, index) => {
    const completesAt = ROLE_COMPLETED_AT_MS[index]!;
    const beginsAt = index === 0 ? 0 : ROLE_COMPLETED_AT_MS[index - 1]!;
    if (elapsedMs < beginsAt) {
      return { role: review.role, status: "waiting", model: null, requestId: null, startedAt: null, completedAt: null, latencyMs: null, verdict: null, summary: null, concerns: [], errorMessage: null };
    }
    if (elapsedMs < completesAt) {
      return { role: review.role, status: "running", model: review.model, requestId: null, startedAt: new Date(startedAt + beginsAt).toISOString(), completedAt: null, latencyMs: null, verdict: null, summary: null, concerns: [], errorMessage: null };
    }
    return {
      role: review.role,
      status: "succeeded",
      model: review.model,
      requestId: review.requestId,
      startedAt: new Date(startedAt + beginsAt).toISOString(),
      completedAt: new Date(startedAt + completesAt).toISOString(),
      // The elapsed time this playback actually took, so the card cannot contradict the clock
      // the viewer just watched. Verdicts, models and request IDs are the recorded ones.
      latencyMs: completesAt - beginsAt,
      verdict: review.verdict,
      summary: review.summary,
      concerns: review.concerns,
      errorMessage: null,
    };
  });
}

/** The recorded chain, with the selected candidate first so the floor gauge matches the plan. */
function chain(): ProtectionChainEntry[] {
  const selected: ProtectionChainEntry = {
    protocolOrderId: capturedCandidate.protocolOrderId ?? capturedCandidate.id,
    strikeUsd: capturedCandidate.strikeUsd,
    expiry: capturedCandidate.expiry,
    premiumUsd: capturedCandidate.premiumUsd,
    estimatedFloorUsd: capturedCandidate.estimatedFloorUsd,
    impliedVolatilityBps: capturedCandidate.impliedVolatilityBps,
    goalCoverageBps: capturedCandidate.goalCoverageBps,
    settlementType: capturedCandidate.settlementType,
    availableQuantityBaseUnits: capturedCandidate.availableQuantityBaseUnits ?? "0",
    settlementTokenSymbol: capturedCandidate.settlementTokenSymbol,
    settlementTokenDecimals: capturedCandidate.settlementTokenDecimals,
  };
  const rest = (capturedSnapshot.chain ?? []).filter((entry) => entry.protocolOrderId !== selected.protocolOrderId);
  return [selected, ...rest];
}

interface Route {
  match: (method: string, path: string) => boolean;
  respond: (signal?: AbortSignal) => Promise<unknown>;
}

const routes: Route[] = [
  {
    match: (method, path) => method === "POST" && path === "/api/goals/parse",
    respond: async (signal) => {
      resetPresentationRun();
      await sleep(STAGE_DELAY_MS.parseGoal, signal);
      return {
        data: {
          draft: {},
          missingFields: [],
          clarificationQuestion: null,
          goal: pristineGoal,
          inference: {
            id: capturedParseInference.id,
            purpose: "goal_parse" as const,
            model: capturedParseInference.model,
            requestId: capturedParseInference.requestId,
            status: "succeeded" as const,
          },
        },
        meta: meta(),
      };
    },
  },
  {
    match: (method, path) => method === "GET" && path.startsWith(`/api/goals/${capturedGoalId}`),
    respond: async (signal) => {
      await sleep(STAGE_DELAY_MS.getGoal, signal);
      return {
        data: reviewCompleted
          ? { goal: reviewedGoal, selectedCandidate: publicCaptured, councilDecision: decisionUnderCurrentRules(), trade: null }
          : { goal: pristineGoal, selectedCandidate: null, councilDecision: null, trade: null },
        meta: meta(),
      };
    },
  },
  {
    match: (method, path) => method === "PATCH" && path.startsWith("/api/goals/"),
    respond: async (signal) => {
      await sleep(STAGE_DELAY_MS.updateGoal, signal);
      return { data: { goal: pristineGoal }, meta: meta() };
    },
  },
  {
    match: (method, path) => method === "POST" && path === "/api/protection/candidates",
    respond: async (signal) => {
      await sleep(STAGE_DELAY_MS.generateCandidates, signal);
      return {
        data: {
          goal: { ...pristineGoal, status: "reviewing" as const, selectedCandidateId: capturedCandidate.id },
          candidates: [publicCaptured],
          chain: chain(),
          selectedCandidateId: capturedCandidate.id,
          rejected: [],
          ethSpotUsd: capturedSnapshot.ethSpotUsd,
          marketAsOf: capturedSnapshot.capturedAt,
        },
        meta: meta(),
      };
    },
  },
  {
    match: (method, path) => method === "GET" && path.startsWith("/api/council/review/status"),
    respond: async (signal) => {
      await sleep(STAGE_DELAY_MS.councilStatus, signal);
      const elapsed = reviewStartedAtMs === null ? 0 : Date.now() - reviewStartedAtMs;
      return { data: { roles: councilProgressAt(elapsed) }, meta: meta() };
    },
  },
  {
    match: (method, path) => method === "POST" && path === "/api/council/review",
    respond: async (signal) => {
      reviewStartedAtMs = Date.now();
      await sleep(STAGE_DELAY_MS.reviewCandidate, signal);
      reviewCompleted = true;
      const decision = decisionUnderCurrentRules();
      return {
        data: {
          goal: reviewedGoal,
          candidate: publicCaptured,
          decision,
          inferences: decision.reviews.map((review) => ({
            id: review.inferenceId,
            purpose: `${review.role}_review` as "strategist_review" | "risk_auditor_review" | "consumer_advocate_review",
            model: review.model,
            requestId: review.requestId,
            status: "succeeded" as const,
          })),
        },
        meta: meta(),
      };
    },
  },
  {
    match: (method, path) => method === "GET" && path.startsWith("/api/market/summary"),
    respond: async (signal) => {
      await sleep(STAGE_DELAY_MS.marketSummary, signal);
      return { data: { snapshot: capturedSnapshot, series: capturedSeries }, meta: meta() };
    },
  },
  {
    match: (method, path) => method === "POST" && path === "/api/trades/preview",
    respond: async (signal) => {
      await sleep(STAGE_DELAY_MS.previewTrade, signal);
      return {
        data: buildPresentationPreview({
          candidate: capturedCandidate,
          publicCandidate: publicCaptured,
          goalId: capturedGoalId,
          councilDecisionId: capturedDecision.id,
          walletAddress: PRESENTATION_WALLET,
          idempotencyKey: crypto.randomUUID(),
          tradeId: crypto.randomUUID(),
          now: new Date(),
        }),
        meta: meta(),
      };
    },
  },
  {
    match: (_method, path) => path.startsWith("/api/integrations/status"),
    respond: async () => ({
      data: {
        database: { status: "ready" as const },
        gonka: { status: "ready" as const, model: capturedDecision.reviews[0]!.model, requestId: capturedDecision.reviews[0]!.requestId },
        thetanuts: { status: "ready" as const, chainId: 8453 as const, activeEthPutCount: capturedSnapshot.optionCount, marketAsOf: capturedSnapshot.capturedAt },
      },
      meta: meta(),
    }),
  },
];

/** Resolves a scripted response, or null when this path has no script and should hit the network. */
export function presentationResponse(method: string, path: string, signal?: AbortSignal): Promise<unknown> | null {
  const route = routes.find((candidate) => candidate.match(method, path));
  return route ? route.respond(signal) : null;
}
