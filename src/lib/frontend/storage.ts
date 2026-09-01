import { Sha256Schema, TxHashSchema, UUIDSchema } from "@/lib/contracts";

export const storageKeys = {
  draft: "goalguard:goal-draft",
  activeGoalId: "goalguard:v1:active-goal-id",
  previewRetry: "goalguard:v1:preview-retry",
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
  submissionIdempotencyKey: string | null;
  txHash: string | null;
}

export interface PreviewRetry {
  goalId: string;
  candidateId: string;
  councilDecisionId: string;
  walletAddress: string;
  idempotencyKey: string;
}

export function readPreviewRetry(): PreviewRetry | null {
  const raw = window.localStorage.getItem(storageKeys.previewRetry);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PreviewRetry>;
    if (!value.goalId || !UUIDSchema.safeParse(value.goalId).success || !value.candidateId || !UUIDSchema.safeParse(value.candidateId).success || !value.councilDecisionId || !UUIDSchema.safeParse(value.councilDecisionId).success || typeof value.walletAddress !== "string" || typeof value.idempotencyKey !== "string" || value.idempotencyKey.length < 16) return null;
    return value as PreviewRetry;
  } catch { return null; }
}

export function savePreviewRetry(value: PreviewRetry) { window.localStorage.setItem(storageKeys.previewRetry, JSON.stringify(value)); }
export function clearPreviewRetry() { window.localStorage.removeItem(storageKeys.previewRetry); }

export function readExecutionRetry(): ExecutionRetry | null {
  const raw = window.localStorage.getItem(storageKeys.executionRetry);
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
  window.localStorage.setItem(storageKeys.executionRetry, JSON.stringify(value));
}

export function clearExecutionRetry() {
  window.localStorage.removeItem(storageKeys.executionRetry);
}
