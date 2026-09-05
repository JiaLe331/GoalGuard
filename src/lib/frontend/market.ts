import type { CandidateRejection } from "@/lib/contracts";

export const rejectionCategoryLabels = {
  too_costly: "Too costly",
  expiry: "Expires too early",
  deadline_gap: "Deadline gap too large",
  liquidity: "Not enough liquidity",
  not_fillable: "Not fillable",
  other: "Other constraint",
} as const;

export type RejectionCategory = keyof typeof rejectionCategoryLabels;

export function categorizeRejection(reasons: readonly string[]): RejectionCategory {
  const text = reasons.join(" ").toLowerCase();
  if (/(cost|premium|budget|preview cap)/.test(text)) return "too_costly";
  if (/(more than .*hours|after the deadline|deadline gap)/.test(text)) return "deadline_gap";
  if (/(expires before|expiry is invalid|option expiry)/.test(text)) return "expiry";
  if (/(liquidity|available order|available .*quantity)/.test(text)) return "liquidity";
  if (/(preview|fillable|signature|supported|collateral|underlying|maker|taker|buyer|token|strike)/.test(text)) return "not_fillable";
  return "other";
}

export interface RejectionGroup {
  category: RejectionCategory;
  label: string;
  entries: CandidateRejection[];
}

export function groupRejections(rejections: readonly CandidateRejection[]): RejectionGroup[] {
  const grouped = new Map<RejectionCategory, CandidateRejection[]>();
  for (const rejection of rejections) {
    const category = categorizeRejection(rejection.reasons);
    const entries = grouped.get(category) ?? [];
    entries.push(rejection);
    grouped.set(category, entries);
  }
  return (Object.keys(rejectionCategoryLabels) as RejectionCategory[])
    .filter((category) => grouped.has(category))
    .map((category) => ({ category, label: rejectionCategoryLabels[category], entries: grouped.get(category)! }));
}

