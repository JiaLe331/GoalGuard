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
  const blockedReasons = concerningVerdict
    ? reviews.filter(({ verdict }) => verdict === concerningVerdict).flatMap(({ concerns, summary }) => concerns.length ? concerns : [summary])
    : [];
  return { status: rejected ? "blocked" : uncertain ? "disputed" : "approved", approved, rejected, uncertain, blockedReasons };
}
