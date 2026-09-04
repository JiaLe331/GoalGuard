import type { ZodType } from "zod";

import {
  ApiErrorResponseSchema,
  GenerateCandidatesResponseSchema,
  GetCouncilReviewStatusResponseSchema,
  GetGoalResponseSchema,
  type JsonValue,
  ParseGoalResponseSchema,
  PreviewTradeResponseSchema,
  ReviewCandidateResponseSchema,
  UpdateGoalResponseSchema,
  type ApiErrorCode,
  type GenerateCandidatesRequest,
  type ParseGoalRequest,
  type PreviewTradeRequest,
  type ReviewCandidateRequest,
  type UpdateGoalRequest,
} from "@/lib/contracts";

export type FrontendErrorCode = ApiErrorCode | "NETWORK_ERROR";

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly code: FrontendErrorCode,
    readonly retryable: boolean,
    readonly fieldErrors: Record<string, string[]> = {},
    readonly requestId: string | null = null,
    readonly details: JsonValue | null = null,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

interface RequestOptions extends RequestInit {
  schema: ZodType;
}

async function readJson(response: Response) {
  try {
    return await response.json() as unknown;
  } catch {
    throw new ApiClientError(
      "GoalGuard received a response it could not read.",
      "UPSTREAM_INVALID_RESPONSE",
      true,
    );
  }
}

export async function requestGoalGuard<T>(path: string, options: RequestOptions): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      credentials: "same-origin",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiClientError("GoalGuard cannot reach the service. Check your connection and retry.", "NETWORK_ERROR", true);
  }

  const payload = await readJson(response);
  if (!response.ok) {
    const parsedError = ApiErrorResponseSchema.safeParse(payload);
    if (!parsedError.success) {
      throw new ApiClientError(
        "GoalGuard received an invalid error response.",
        "UPSTREAM_INVALID_RESPONSE",
        true,
      );
    }
    const { error, meta } = parsedError.data;
    throw new ApiClientError(error.message, error.code, error.retryable, error.fieldErrors, meta.requestId, error.details);
  }

  const parsed = options.schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiClientError(
      "GoalGuard received data that did not match its safety contract.",
      "UPSTREAM_INVALID_RESPONSE",
      true,
    );
  }
  return parsed.data as T;
}

const post = <T>(path: string, body: unknown, schema: ZodType, headers?: HeadersInit, signal?: AbortSignal) =>
  requestGoalGuard<T>(path, { method: "POST", body: JSON.stringify(body), schema, headers, signal });

export const goalGuardApi = {
  parseGoal: (body: ParseGoalRequest, signal?: AbortSignal) =>
    post<ReturnType<typeof ParseGoalResponseSchema.parse>>("/api/goals/parse", body, ParseGoalResponseSchema, undefined, signal),
  updateGoal: (goalId: string, body: UpdateGoalRequest, signal?: AbortSignal) =>
    requestGoalGuard<ReturnType<typeof UpdateGoalResponseSchema.parse>>(`/api/goals/${goalId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
      schema: UpdateGoalResponseSchema,
      signal,
    }),
  getGoal: (goalId: string, signal?: AbortSignal) =>
    requestGoalGuard<ReturnType<typeof GetGoalResponseSchema.parse>>(`/api/goals/${goalId}`, { schema: GetGoalResponseSchema, signal }),
  generateCandidates: (body: GenerateCandidatesRequest, signal?: AbortSignal) =>
    post<ReturnType<typeof GenerateCandidatesResponseSchema.parse>>("/api/protection/candidates", body, GenerateCandidatesResponseSchema, undefined, signal),
  reviewCandidate: (body: ReviewCandidateRequest, signal?: AbortSignal) =>
    post<ReturnType<typeof ReviewCandidateResponseSchema.parse>>("/api/council/review", body, ReviewCandidateResponseSchema, undefined, signal),
  getCouncilReviewStatus: (goalId: string, candidateId: string, signal?: AbortSignal) =>
    requestGoalGuard<ReturnType<typeof GetCouncilReviewStatusResponseSchema.parse>>(`/api/council/review/status?goalId=${encodeURIComponent(goalId)}&candidateId=${encodeURIComponent(candidateId)}`, { schema: GetCouncilReviewStatusResponseSchema, signal }),
  previewTrade: (body: PreviewTradeRequest, idempotencyKey: string, signal?: AbortSignal) =>
    post<ReturnType<typeof PreviewTradeResponseSchema.parse>>("/api/trades/preview", body, PreviewTradeResponseSchema, { "Idempotency-Key": idempotencyKey }, signal),
};
