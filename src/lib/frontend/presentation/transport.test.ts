import { describe, expect, it } from "vitest";

import { GetCouncilReviewStatusResponseSchema, ReviewCandidateResponseSchema } from "@/lib/contracts";
import { councilConsensus } from "@/lib/council/rules";

import { capturedDecision } from "./captured-run";
import { councilProgressAt, presentationResponse, resetPresentationRun } from "./transport";

describe("presentation transport", () => {
  it("reveals the three roles one at a time, in order", () => {
    resetPresentationRun();
    const at = (ms: number) => councilProgressAt(ms).map((role) => role.status);

    expect(at(0)).toEqual(["running", "waiting", "waiting"]);
    expect(at(2_000)).toEqual(["succeeded", "running", "waiting"]);
    expect(at(4_000)).toEqual(["succeeded", "succeeded", "running"]);
    expect(at(6_000)).toEqual(["succeeded", "succeeded", "succeeded"]);
  });

  it("withholds a verdict until its role has finished", () => {
    resetPresentationRun();
    const [strategist] = councilProgressAt(0);

    expect(strategist).toMatchObject({ status: "running", verdict: null, requestId: null });
    expect(councilProgressAt(6_000)[0]).toMatchObject({ status: "succeeded", verdict: "approve" });
  });

  it("carries the recorded Gonka request IDs rather than inventing them", () => {
    resetPresentationRun();
    const finished = councilProgressAt(6_000);

    expect(finished.map((role) => role.requestId)).toEqual(capturedDecision.reviews.map((review) => review.requestId));
    expect(finished.map((role) => role.model)).toEqual(capturedDecision.reviews.map((review) => review.model));
    for (const role of finished) expect(role.requestId).toMatch(/^req-\d+-\d+$/);
  });

  it("reports an elapsed time consistent with the compressed clock, not the recorded one", () => {
    resetPresentationRun();
    // The recorded strategist call took 230s. Showing that beside a card that resolved in a
    // second and a half would contradict the clock the audience just watched.
    for (const role of councilProgressAt(6_000)) {
      expect(role.latencyMs).toBeGreaterThan(0);
      expect(role.latencyMs).toBeLessThanOrEqual(2_000);
    }
  });

  it("scores the recorded verdicts with the current ruleset instead of replaying a stale status", async () => {
    resetPresentationRun();
    // The stored decision predates the two-thirds rule and says "disputed"; the same verdicts
    // under today's rule approve, which is what unlocks the preview.
    expect(capturedDecision.status).toBe("disputed");
    expect(councilConsensus(capturedDecision.reviews).status).toBe("approved");

    const scripted = presentationResponse("POST", "/api/council/review");
    const parsed = ReviewCandidateResponseSchema.parse(await scripted);
    expect(parsed.data.decision.status).toBe("approved");
    expect(parsed.data.decision.approvedReviewCount).toBe(2);
    // The dissent is not discarded on approval.
    expect(parsed.data.decision.blockedReasons.length).toBeGreaterThan(0);
  }, 10_000);

  it("keeps the whole scripted review inside the demo's time budget", async () => {
    resetPresentationRun();
    const started = Date.now();
    await presentationResponse("POST", "/api/council/review");
    expect(Date.now() - started).toBeLessThan(9_000);
  }, 12_000);

  it("returns schema-valid council progress", async () => {
    resetPresentationRun();
    const scripted = presentationResponse("GET", "/api/council/review/status?goalId=x&candidateId=y");
    expect(() => GetCouncilReviewStatusResponseSchema.parse(scripted && undefined)).toThrow();
    const parsed = GetCouncilReviewStatusResponseSchema.parse(await scripted);
    expect(parsed.data.roles).toHaveLength(3);
  });

  it("leaves unscripted paths to the network", () => {
    expect(presentationResponse("POST", "/api/something/else")).toBeNull();
  });

  it("aborts in flight rather than resolving after the caller gave up", async () => {
    resetPresentationRun();
    const controller = new AbortController();
    const scripted = presentationResponse("POST", "/api/goals/parse", controller.signal);
    controller.abort();

    await expect(scripted).rejects.toMatchObject({ name: "AbortError" });
  });
});
