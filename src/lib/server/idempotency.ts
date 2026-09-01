import type { ZodType } from "zod";

import { PostgresGoalGuardRepository, type TradeIdempotencyOperation } from "@/lib/db/repository";
import { hashJson } from "@/lib/domain/hash";
import { ApiRouteError, jsonSuccess } from "./http";

interface IdempotentMutationOptions<T> {
  key: string;
  operation: TradeIdempotencyOperation;
  ownerSessionHash: string;
  request: unknown;
  repository: PostgresGoalGuardRepository;
  schema: ZodType<T>;
  execute: () => Promise<{ body: T; tradeId: string | null; status?: number }>;
}

interface StoredResponse {
  body: unknown;
  status: number;
}

export async function idempotentTradeMutation<T>(options: IdempotentMutationOptions<T>) {
  const requestHash = hashJson({ operation: options.operation, request: options.request });
  const claim = await options.repository.claimTradeRequest(options.key, options.operation, options.ownerSessionHash, requestHash);
  if (claim.status === "in_progress") throw new ApiRouteError("CONFLICT", "An identical request is already in progress.", 409, true);
  if (claim.status === "replay") {
    const stored = claim.response as StoredResponse;
    if (!stored || typeof stored.status !== "number" || !("body" in stored)) throw new ApiRouteError("INTERNAL_ERROR", "The saved idempotent response is invalid.", 500, true);
    return jsonSuccess(options.schema, options.schema.parse(stored.body), stored.status);
  }
  try {
    const result = await options.execute();
    const body = options.schema.parse(result.body);
    const stored = { body, status: result.status ?? 200 } satisfies StoredResponse;
    await options.repository.completeTradeRequest(options.key, options.ownerSessionHash, requestHash, result.tradeId, stored);
    return jsonSuccess(options.schema, body, stored.status);
  } catch (error) {
    await options.repository.releaseTradeRequest(options.key, options.ownerSessionHash, requestHash);
    throw error;
  }
}
