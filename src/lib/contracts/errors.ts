import { z } from "zod";

import { ISODateTimeSchema, JsonValueSchema } from "./scalars";

export const ApiErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "CONFLICT",
  "IDEMPOTENCY_CONFLICT",
  "GOAL_INCOMPLETE",
  "NO_SUITABLE_CANDIDATE",
  "COUNCIL_NOT_APPROVED",
  "CANDIDATE_STALE",
  "QUOTE_EXPIRED",
  "EXECUTION_DISABLED",
  "TRADE_CAP_EXCEEDED",
  "WRONG_NETWORK",
  "INSUFFICIENT_BALANCE",
  "INSUFFICIENT_EXPOSURE",
  "TRADE_MONITOR_UNAVAILABLE",
  "TELEGRAM_UNAVAILABLE",
  "TELEGRAM_LINK_EXPIRED",
  "GONKA_UNAVAILABLE",
  "THETANUTS_UNAVAILABLE",
  "UPSTREAM_INVALID_RESPONSE",
  "INTERNAL_ERROR",
]);

export const ApiMetaSchema = z.object({
  requestId: z.string().uuid(),
  timestamp: ISODateTimeSchema,
}).strict();

export const ApiErrorResponseSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string().trim().min(1),
    retryable: z.boolean(),
    fieldErrors: z.record(z.string(), z.array(z.string())),
    details: JsonValueSchema.nullable(),
  }).strict(),
  meta: ApiMetaSchema,
}).strict();

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;
export type ApiMeta = z.infer<typeof ApiMetaSchema>;
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
