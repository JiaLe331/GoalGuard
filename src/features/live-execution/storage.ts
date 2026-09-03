import { Sha256Schema, TxHashSchema, UUIDSchema } from "@/lib/contracts";

const executionRetryKey = "goalguard:v1:execution-retry";

export interface ExecutionRetry {
  tradeId: string;
  quoteFingerprint: string;
  idempotencyKey: string;
  submissionIdempotencyKey: string | null;
  txHash: string | null;
}

export function readExecutionRetry(): ExecutionRetry | null {
  const raw = window.localStorage.getItem(executionRetryKey);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ExecutionRetry>;
    const submissionIdempotencyKey = value.submissionIdempotencyKey ?? null;
    if (
      !value.tradeId || !UUIDSchema.safeParse(value.tradeId).success ||
      !Sha256Schema.safeParse(value.quoteFingerprint).success ||
      typeof value.idempotencyKey !== "string" || value.idempotencyKey.length < 16 ||
      !(submissionIdempotencyKey === null || (typeof submissionIdempotencyKey === "string" && submissionIdempotencyKey.length >= 16)) ||
      !(value.txHash === null || TxHashSchema.safeParse(value.txHash).success)
    ) return null;
    return { ...value, submissionIdempotencyKey } as ExecutionRetry;
  } catch {
    return null;
  }
}

export function saveExecutionRetry(value: ExecutionRetry) {
  window.localStorage.setItem(executionRetryKey, JSON.stringify(value));
}

export function clearExecutionRetry() {
  window.localStorage.removeItem(executionRetryKey);
}
