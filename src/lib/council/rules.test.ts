import { describe, expect, it } from "vitest";
import type { CouncilReview } from "@/lib/contracts";
import { fixtureDecision } from "@/test/fixtures/goalguard";
import { councilConsensus } from "./rules";

const withVerdict = (index: number, verdict: CouncilReview["verdict"], concerns: string[] = []) => fixtureDecision.reviews.map((review, reviewIndex) => reviewIndex === index ? { ...review, verdict, concerns } : review);

describe("deterministic council consensus", () => {
  it("requires all three approvals", () => { expect(councilConsensus(fixtureDecision.reviews)).toMatchObject({ status: "approved", approved: 3, rejected: 0, uncertain: 0 }); });
  it("blocks on any rejection and preserves safe concerns", () => { expect(councilConsensus(withVerdict(1, "reject", ["Premium exceeds the goal limit."]))).toMatchObject({ status: "blocked", rejected: 1, blockedReasons: ["Premium exceeds the goal limit."] }); });
  it("disputes on uncertainty without treating it as approval", () => { expect(councilConsensus(withVerdict(2, "uncertain"))).toMatchObject({ status: "disputed", approved: 2, uncertain: 1 }); });
});
