import type {
  ApiMeta,
  CouncilDecision,
  GetGoalResponse,
  Goal,
  GoalDraft,
  JsonValue,
  PreviewTradeResponse,
  PublicProtectionCandidate,
  Trade,
  TradePreview,
} from "@/lib/contracts";
import type { ApiClientError } from "./api-client";

export type WorkflowStage =
  | "new_goal"
  | "confirming_goal"
  | "searching_candidates"
  | "reviewing_candidate"
  | "plan_approved"
  | "plan_disputed"
  | "plan_blocked"
  | "confirming_preview"
  | "generating_preview"
  | "demo_preview_ready"
  | "read_only_trade"
  | "recoverable_error"
  | "terminal_error";

export interface WorkflowError {
  message: string;
  code: string;
  retryable: boolean;
  requestId: string | null;
  fieldErrors: Record<string, string[]>;
  details: JsonValue | null;
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
  previewMeta: ApiMeta | null;
  previewAcknowledged: boolean;
  physicalSettlementAcknowledged: boolean;
  trade: Trade | null;
  error: WorkflowError | null;
  notice: string | null;
}

export const initialWorkflowState: WorkflowState = {
  stage: "new_goal",
  goal: null,
  draft: {},
  candidates: [],
  selectedCandidate: null,
  decision: null,
  preview: null,
  previewMeta: null,
  previewAcknowledged: false,
  physicalSettlementAcknowledged: false,
  trade: null,
  error: null,
  notice: null,
};

export type WorkflowAction =
  | { type: "hydrate"; response: GetGoalResponse }
  | { type: "goal_updated"; goal: Goal }
  | { type: "search_started" }
  | { type: "candidates_found"; goal: Goal; candidates: PublicProtectionCandidate[]; selected: PublicProtectionCandidate }
  | { type: "review_started" }
  | { type: "review_completed"; goal: Goal; candidate: PublicProtectionCandidate; decision: CouncilDecision }
  | { type: "preview_confirmation_started" }
  | { type: "preview_confirmation_cancelled" }
  | { type: "preview_acknowledgment_changed"; acknowledged: boolean }
  | { type: "physical_settlement_acknowledgment_changed"; acknowledged: boolean }
  | { type: "preview_started" }
  | { type: "preview_ready"; response: PreviewTradeResponse }
  | { type: "preview_invalidated"; notice: string }
  | { type: "restart" }
  | { type: "error"; error: WorkflowError }
  | { type: "clear_error" }
  | { type: "notice"; notice: string | null };

function stageForDecision(decision: CouncilDecision) {
  if (decision.status === "approved") return "plan_approved" as const;
  if (decision.status === "disputed") return "plan_disputed" as const;
  return "plan_blocked" as const;
}

export function stageForHydration({ data }: GetGoalResponse): WorkflowStage {
  if (data.trade?.status === "submitted" || data.trade?.status === "confirmed") return "read_only_trade";
  if (data.councilDecision) return stageForDecision(data.councilDecision);
  if (["searching", "reviewing", "failed"].includes(data.goal.status)) return "recoverable_error";
  return "confirming_goal";
}

export function workflowReducer(state: WorkflowState, action: WorkflowAction): WorkflowState {
  switch (action.type) {
    case "hydrate": {
      const interrupted = ["searching", "reviewing", "failed"].includes(action.response.data.goal.status);
      const hadPreview = action.response.data.trade?.status === "previewed";
      return {
        ...initialWorkflowState,
        stage: stageForHydration(action.response),
        goal: action.response.data.goal,
        selectedCandidate: action.response.data.selectedCandidate,
        decision: action.response.data.councilDecision,
        trade: action.response.data.trade,
        notice: hadPreview
          ? "For your safety, unsigned transaction data is never restored from this browser. Review the approved plan and generate a fresh preview."
          : null,
        error: interrupted
          ? {
              message: "The previous step was interrupted. Your saved goal is safe and can be retried.",
              code: "INTERRUPTED",
              retryable: true,
              requestId: null,
              fieldErrors: {},
              details: null,
              returnStage: action.response.data.selectedCandidate ? "plan_approved" : "confirming_goal",
            }
          : null,
      };
    }
    case "goal_updated":
      return { ...state, goal: action.goal, stage: "confirming_goal", error: null, notice: "Goal changes saved.", previewAcknowledged: false, physicalSettlementAcknowledged: false };
    case "search_started":
      return { ...state, stage: "searching_candidates", error: null, notice: null, preview: null, previewMeta: null, previewAcknowledged: false, physicalSettlementAcknowledged: false };
    case "candidates_found":
      return { ...state, goal: action.goal, candidates: action.candidates, selectedCandidate: action.selected, error: null };
    case "review_started":
      return { ...state, stage: "reviewing_candidate", error: null };
    case "review_completed":
      return {
        ...state,
        stage: stageForDecision(action.decision),
        goal: action.goal,
        selectedCandidate: action.candidate,
        decision: action.decision,
        preview: null,
        previewMeta: null,
        previewAcknowledged: false,
        physicalSettlementAcknowledged: false,
        error: null,
      };
    case "preview_confirmation_started":
      if (state.stage !== "plan_approved") return state;
      return { ...state, stage: "confirming_preview", previewAcknowledged: false, physicalSettlementAcknowledged: false, error: null, notice: null };
    case "preview_confirmation_cancelled":
      return { ...state, stage: "plan_approved", previewAcknowledged: false, physicalSettlementAcknowledged: false, error: null };
    case "preview_acknowledgment_changed":
      if (state.stage !== "confirming_preview") return state;
      return { ...state, previewAcknowledged: action.acknowledged };
    case "physical_settlement_acknowledgment_changed":
      if (state.stage !== "confirming_preview") return state;
      return { ...state, physicalSettlementAcknowledged: action.acknowledged };
    case "preview_started": {
      if (state.stage !== "confirming_preview" || !state.previewAcknowledged) return state;
      const requiresPhysicalAcknowledgment = state.selectedCandidate?.settlementType === "physical";
      if (requiresPhysicalAcknowledgment && !state.physicalSettlementAcknowledged) return state;
      return { ...state, stage: "generating_preview", error: null, notice: null };
    }
    case "preview_ready":
      if (state.stage !== "generating_preview") return state;
      return {
        ...state,
        stage: "demo_preview_ready",
        preview: action.response.data,
        previewMeta: action.response.meta,
        trade: action.response.data.trade,
        previewAcknowledged: false,
        physicalSettlementAcknowledged: false,
        error: null,
      };
    case "preview_invalidated":
      return {
        ...state,
        stage: "plan_approved",
        preview: null,
        previewMeta: null,
        previewAcknowledged: false,
        physicalSettlementAcknowledged: false,
        notice: action.notice,
      };
    case "restart":
      return initialWorkflowState;
    case "error":
      return {
        ...state,
        stage: action.error.retryable ? "recoverable_error" : "terminal_error",
        previewAcknowledged: false,
        physicalSettlementAcknowledged: false,
        error: action.error,
      };
    case "clear_error":
      return { ...state, stage: state.error?.returnStage ?? "confirming_goal", previewAcknowledged: false, physicalSettlementAcknowledged: false, error: null };
    case "notice":
      return { ...state, notice: action.notice };
  }
}

export function workflowError(error: unknown, returnStage: WorkflowStage): WorkflowError {
  const apiError = error as Partial<ApiClientError>;
  return {
    message: typeof apiError.message === "string" ? apiError.message : "GoalGuard could not complete this step.",
    code: typeof apiError.code === "string" ? apiError.code : "INTERNAL_ERROR",
    retryable: typeof apiError.retryable === "boolean" ? apiError.retryable : true,
    requestId: typeof apiError.requestId === "string" ? apiError.requestId : null,
    fieldErrors: apiError.fieldErrors ?? {},
    details: apiError.details ?? null,
    returnStage,
  };
}
