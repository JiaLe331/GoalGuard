import type { CouncilDecision, GetGoalResponse, Goal, GoalDraft, PublicProtectionCandidate, TradePreview } from "@/lib/contracts";
import type { ApiClientError } from "./api-client";

export type WorkflowStage = "new_goal" | "parsing_goal" | "clarifying_goal" | "confirming_goal" | "searching_candidates" | "reviewing_candidate" | "plan_approved" | "plan_disputed" | "plan_blocked" | "previewing_trade" | "preview_ready" | "recoverable_error" | "terminal_error";

export interface WorkflowError {
  message: string;
  code: string;
  retryable: boolean;
  requestId: string | null;
  fieldErrors: Record<string, string[]>;
  returnStage: WorkflowStage;
}

export interface WorkflowState {
  stage: WorkflowStage;
  goal: Goal | null;
  draft: GoalDraft;
  candidates: PublicProtectionCandidate[];
  selectedCandidate: PublicProtectionCandidate | null;
  decision: CouncilDecision | null;
  preview: TradePreview | null;
  error: WorkflowError | null;
  notice: string | null;
}

export const initialWorkflowState: WorkflowState = { stage: "new_goal", goal: null, draft: {}, candidates: [], selectedCandidate: null, decision: null, preview: null, error: null, notice: null };

export type WorkflowAction =
  | { type: "hydrate"; response: GetGoalResponse }
  | { type: "goal_updated"; goal: Goal }
  | { type: "search_started" }
  | { type: "candidates_found"; goal: Goal; candidates: PublicProtectionCandidate[]; selected: PublicProtectionCandidate }
  | { type: "review_started" }
  | { type: "review_completed"; goal: Goal; candidate: PublicProtectionCandidate; decision: CouncilDecision }
  | { type: "preview_started" }
  | { type: "preview_ready"; preview: TradePreview }
  | { type: "error"; error: WorkflowError }
  | { type: "clear_error" }
  | { type: "notice"; notice: string | null };

function stageForDecision(decision: CouncilDecision) {
  if (decision.status === "approved") return "plan_approved" as const;
  if (decision.status === "disputed") return "plan_disputed" as const;
  return "plan_blocked" as const;
}

export function stageForHydration({ data }: GetGoalResponse): WorkflowStage {
  if (data.councilDecision) return stageForDecision(data.councilDecision);
  if (data.goal.status === "draft") return "confirming_goal";
  return "recoverable_error";
}

export function workflowReducer(state: WorkflowState, action: WorkflowAction): WorkflowState {
  switch (action.type) {
    case "hydrate":
      return {
        ...initialWorkflowState, stage: stageForHydration(action.response), goal: action.response.data.goal,
        selectedCandidate: action.response.data.selectedCandidate, decision: action.response.data.councilDecision,
        error: action.response.data.councilDecision || action.response.data.goal.status === "draft" ? null : {
          message: "The previous step was interrupted. Your saved goal is safe and can be retried.", code: "INTERRUPTED", retryable: true, requestId: null, fieldErrors: {}, returnStage: action.response.data.selectedCandidate ? "plan_approved" : "confirming_goal",
        },
        notice: action.response.data.trade?.status === "previewed" ? "A previous unsigned preview was not retained in this browser. Generate a fresh preview to inspect live details." : null,
      };
    case "goal_updated": return { ...state, goal: action.goal, stage: "confirming_goal", error: null, notice: "Goal changes saved." };
    case "search_started": return { ...state, stage: "searching_candidates", error: null, notice: null, preview: null };
    case "candidates_found": return { ...state, goal: action.goal, candidates: action.candidates, selectedCandidate: action.selected, error: null };
    case "review_started": return { ...state, stage: "reviewing_candidate", error: null };
    case "review_completed": return { ...state, stage: stageForDecision(action.decision), goal: action.goal, selectedCandidate: action.candidate, decision: action.decision, error: null };
    case "preview_started": return { ...state, stage: "previewing_trade", error: null, notice: null };
    case "preview_ready": return { ...state, stage: "preview_ready", preview: action.preview, error: null };
    case "error": return { ...state, stage: action.error.retryable ? "recoverable_error" : "terminal_error", error: action.error };
    case "clear_error": return { ...state, stage: state.error?.returnStage ?? "confirming_goal", error: null };
    case "notice": return { ...state, notice: action.notice };
  }
}

export function workflowError(error: unknown, returnStage: WorkflowStage): WorkflowError {
  const apiError = error as Partial<ApiClientError>;
  return { message: typeof apiError.message === "string" ? apiError.message : "GoalGuard could not complete this step.", code: typeof apiError.code === "string" ? apiError.code : "INTERNAL_ERROR", retryable: typeof apiError.retryable === "boolean" ? apiError.retryable : true, requestId: typeof apiError.requestId === "string" ? apiError.requestId : null, fieldErrors: apiError.fieldErrors ?? {}, returnStage };
}
