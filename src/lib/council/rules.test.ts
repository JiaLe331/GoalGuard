import { describe, expect, it } from "vitest";
import type { CouncilReview } from "@/lib/contracts";
import { fixtureDecision } from "@/test/fixtures/goalguard";
import { councilConsensus } from "./rules";

const withVerdict = (index: number, verdict: CouncilReview["verdict"], concerns: string[] = []) => fixtureDecision.reviews.map((review, reviewIndex) => reviewIndex === index ? { ...review, verdict, concerns } : review);

describe("deterministic council consensus", () => {
  it("approves when all three approve", () => { expect(councilConsensus(fixtureDecision.reviews)).toMatchObject({ status: "approved", approved: 3, rejected: 0, uncertain: 0 }); });
  it("blocks on any rejection and preserves safe concerns", () => { expect(councilConsensus(withVerdict(1, "reject", ["Premium exceeds the goal limit."]))).toMatchObject({ status: "blocked", rejected: 1, blockedReasons: ["Premium exceeds the goal limit."] }); });
  it("blocks on a rejection even when the other two approve", () => { expect(councilConsensus(withVerdict(0, "reject"))).toMatchObject({ status: "blocked", approved: 2, rejected: 1 }); });
  it("approves on a two-thirds majority when nobody rejects", () => { expect(councilConsensus(withVerdict(2, "uncertain"))).toMatchObject({ status: "approved", approved: 2, uncertain: 1 }); });
  it("keeps the uncertain reviewer's concern as a disclosure on an approved plan", () => { expect(councilConsensus(withVerdict(2, "uncertain", ["Settlement asset is unfamiliar."]))).toMatchObject({ status: "approved", blockedReasons: ["Settlement asset is unfamiliar."] }); });
  it("disputes when uncertainty costs the majority", () => {
    const twoUncertain = fixtureDecision.reviews.map((review, index) => index === 0 ? review : { ...review, verdict: "uncertain" as const, concerns: ["Needs another look."] });
    expect(councilConsensus(twoUncertain)).toMatchObject({ status: "disputed", approved: 1, uncertain: 2, blockedReasons: ["Needs another look.", "Needs another look."] });
  });
});
