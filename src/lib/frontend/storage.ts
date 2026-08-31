import { Sha256Schema, TxHashSchema, UUIDSchema } from "@/lib/contracts";

export const storageKeys = {
  draft: "goalguard:goal-draft",
  activeGoalId: "goalguard:v1:active-goal-id",
  executionRetry: "goalguard:v1:execution-retry",
} as const;

export function readActiveGoalId() {
  const value = window.localStorage.getItem(storageKeys.activeGoalId);
  return value && UUIDSchema.safeParse(value).success ? value : null;
}

export function saveActiveGoalId(goalId: string) {
  window.localStorage.setItem(storageKeys.activeGoalId, UUIDSchema.parse(goalId));
}

export interface ExecutionRetry {
  tradeId: string;
  quoteFingerprint: string;
  idempotencyKey: string;
  txHash: string | null;
}

export function readExecutionRetry(): ExecutionRetry | null {
  const raw = window.localStorage.getItem(storageKeys.executionRetry);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ExecutionRetry>;
    if (
      !value.tradeId || !UUIDSchema.safeParse(value.tradeId).success ||
      !Sha256Schema.safeParse(value.quoteFingerprint).success ||
      typeof value.idempotencyKey !== "string" || value.idempotencyKey.length < 16 ||
      !(value.txHash === null || TxHashSchema.safeParse(value.txHash).success)
    ) return null;
    return value as ExecutionRetry;
  } catch {
    return null;
  }
}

export function saveExecutionRetry(value: ExecutionRetry) {
  window.localStorage.setItem(storageKeys.executionRetry, JSON.stringify(value));
}

export function clearExecutionRetry() {
  window.localStorage.removeItem(storageKeys.executionRetry);
}
