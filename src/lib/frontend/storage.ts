import { z } from "zod";
import { DecimalStringSchema, GoalStatusSchema, GoalTypeSchema, ISODateTimeSchema, UUIDSchema } from "@/lib/contracts";

export const storageKeys = {
  draft: "goalguard:goal-draft",
  activeGoalId: "goalguard:v1:active-goal-id",
  previewRetry: "goalguard:v1:preview-retry",
  recentGoals: "goalguard:v1:recent-goals",
} as const;

export function readActiveGoalId() {
  const value = window.localStorage.getItem(storageKeys.activeGoalId);
  return value && UUIDSchema.safeParse(value).success ? value : null;
}

export function saveActiveGoalId(goalId: string) {
  window.localStorage.setItem(storageKeys.activeGoalId, UUIDSchema.parse(goalId));
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

// A per-browser, best-effort "recent goals" list -- cached metadata plus the last status observed
// by a goal workspace, not an authority (re-opening a goal always re-hydrates live state from the server).
// This needs no new backend capability: goals are already scoped to this browser's 30-day
// anonymous session cookie, and GET /api/goals/[goalId] already returns full live state for any
// goal ID this browser owns -- the only missing piece was a client-side list of IDs to link to.
const RecentGoalEntrySchema = z.object({
  id: UUIDSchema,
  createdAt: ISODateTimeSchema,
  goalType: GoalTypeSchema,
  customGoalLabel: z.string().trim().min(1).max(80).nullable(),
  protectedValueUsd: DecimalStringSchema,
  // Older browser entries predate the status cue, so this stays optional and is treated as
  // "saved locally" until the goal is opened and its live status is known.
  status: GoalStatusSchema.optional(),
}).strict();

export type RecentGoalEntry = z.infer<typeof RecentGoalEntrySchema>;

const MAX_RECENT_GOALS = 8;

export function readRecentGoals(): RecentGoalEntry[] {
  const raw = window.localStorage.getItem(storageKeys.recentGoals);
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
      const parsed = RecentGoalEntrySchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return [];
  }
}

export function saveRecentGoal(entry: RecentGoalEntry) {
  const deduped = readRecentGoals().filter((item) => item.id !== entry.id);
  const updated = [entry, ...deduped].slice(0, MAX_RECENT_GOALS);
  window.localStorage.setItem(storageKeys.recentGoals, JSON.stringify(updated));
}
