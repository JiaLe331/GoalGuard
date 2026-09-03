import {
  GetTradeResponseSchema,
  PrepareExecutionResponseSchema,
  RecordSubmissionResponseSchema,
  type PrepareExecutionRequest,
  type RecordSubmissionRequest,
} from "@/lib/contracts";
import { requestGoalGuard } from "@/lib/frontend/api-client";

// Future-only boundary. Nothing in the P0 product imports this module.
const post = <T>(path: string, body: unknown, schema: Parameters<typeof requestGoalGuard<T>>[1]["schema"], headers?: HeadersInit, signal?: AbortSignal) =>
  requestGoalGuard<T>(path, { method: "POST", body: JSON.stringify(body), schema, headers, signal });

export const liveExecutionApi = {
  prepareExecution: (body: PrepareExecutionRequest, idempotencyKey: string, signal?: AbortSignal) =>
    post<ReturnType<typeof PrepareExecutionResponseSchema.parse>>(
      "/api/trades/execute",
      body,
      PrepareExecutionResponseSchema,
      { "Idempotency-Key": idempotencyKey },
      signal,
    ),
  recordSubmission: (tradeId: string, body: RecordSubmissionRequest, idempotencyKey: string, signal?: AbortSignal) =>
    post<ReturnType<typeof RecordSubmissionResponseSchema.parse>>(
      `/api/trades/${tradeId}/submission`,
      body,
      RecordSubmissionResponseSchema,
      { "Idempotency-Key": idempotencyKey },
      signal,
    ),
  getTrade: (tradeId: string, signal?: AbortSignal) =>
    requestGoalGuard<ReturnType<typeof GetTradeResponseSchema.parse>>(`/api/trades/${tradeId}`, {
      schema: GetTradeResponseSchema,
      signal,
    }),
};
