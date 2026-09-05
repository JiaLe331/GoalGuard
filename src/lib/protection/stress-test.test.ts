import { describe, expect, it } from "vitest";
import { computeStressOutcome, minStressShockBps, strikeShockBps } from "./stress-test";

const input = { protectedValueUsd: "1000", strikeUsd: "1800", quantityUnderlying: "0.5", premiumUsd: "5", spotUsd: "2000" };

describe("deterministic protection stress test", () => {
  it("matches a flat price to the no-move case: no payoff, premium already spent", () => {
    const outcome = computeStressOutcome(input, 0);
    expect(outcome).toMatchObject({
      settlementPriceUsd: "2000.00",
      underlyingValueUsd: "1000.00",
      optionPayoffUsd: "0.00",
      noProtectionFinalUsd: "1000.00",
      goalGuardFinalUsd: "995.00",
      downsideAvoidedUsd: "-5.00",
      breachesStrike: false,
    });
  });

  it("pays out once the hypothetical price breaches the strike", () => {
    // -20%: price 1600, strike 1800 -> payoff 200 * 0.5 = 100
    const outcome = computeStressOutcome(input, -2000);
    expect(outcome).toMatchObject({
      settlementPriceUsd: "1600.00",
      underlyingValueUsd: "800.00",
      optionPayoffUsd: "100.00",
      noProtectionFinalUsd: "800.00",
      goalGuardFinalUsd: "895.00",
      downsideAvoidedUsd: "95.00",
      breachesStrike: true,
    });
  });

  it("keeps the put worthless on any move that stays above the strike", () => {
    const outcome = computeStressOutcome(input, -500); // price 1900, still above strike 1800
    expect(outcome).toMatchObject({ optionPayoffUsd: "0.00", breachesStrike: false });
  });

  it("treats settlement exactly at the strike as breaching (the put is at the money)", () => {
    const outcome = computeStressOutcome(input, -1000); // price 1800 == strike
    expect(outcome).toMatchObject({ optionPayoffUsd: "0.00", breachesStrike: true });
  });

  it("scales the payoff with the covered quantity, not just the price move", () => {
    const doubled = computeStressOutcome({ ...input, quantityUnderlying: "1" }, -2000);
    expect(doubled.optionPayoffUsd).toBe("200.00");
  });

  it("derives the strike's shock in basis points off spot", () => {
    expect(strikeShockBps(input.strikeUsd, input.spotUsd)).toBe(-1000);
  });

  it("keeps the slider floor comfortably below the strike even far out of the money", () => {
    expect(minStressShockBps(-1000)).toBe(-6000);
    expect(minStressShockBps(-9000)).toBeLessThan(-9000);
  });
});
