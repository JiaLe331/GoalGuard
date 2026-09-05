import type { CouncilReview, CouncilStatus } from "@/lib/contracts";

export function councilConsensus(reviews: readonly CouncilReview[]): {
  status: CouncilStatus;
  approved: number;
  rejected: number;
  uncertain: number;
  blockedReasons: string[];
} {
  const approved = reviews.filter(({ verdict }) => verdict === "approve").length;
  const rejected = reviews.filter(({ verdict }) => verdict === "reject").length;
  const uncertain = reviews.filter(({ verdict }) => verdict === "uncertain").length;
  const concerningVerdict = rejected ? "reject" : uncertain ? "uncertain" : null;
  // Carried on every outcome, not just the failing ones: a majority-approved plan still has to
  // show the dissenting reviewer's concern, otherwise the disclosure disappears on approval.
  const blockedReasons = concerningVerdict
    ? reviews.filter(({ verdict }) => verdict === concerningVerdict).flatMap(({ concerns, summary }) => concerns.length ? concerns : [summary])
    : [];
  // A single reject is still a hard stop -- one reviewer may have seen a real disqualifier.
  // Short of that, a majority carries the plan and the minority's doubt travels with it as a
  // disclosure. Requiring unanimity made approval unreachable in practice, because "uncertain"
  // is the honest answer to a genuinely uncertain market and any one of the three could give it.
  const status = rejected ? "blocked" : approved >= 2 ? "approved" : "disputed";
  return { status, approved, rejected, uncertain, blockedReasons };
}
