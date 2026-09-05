import Decimal from "decimal.js";

export interface StressTestCandidateInput {
  protectedValueUsd: string;
  strikeUsd: string;
  quantityUnderlying: string;
  premiumUsd: string;
  spotUsd: string;
}

export interface StressTestOutcome {
  shockBps: number;
  settlementPriceUsd: string;
  underlyingValueUsd: string;
  optionPayoffUsd: string;
  premiumUsd: string;
  noProtectionFinalUsd: string;
  goalGuardFinalUsd: string;
  downsideAvoidedUsd: string;
  /** Whether this hypothetical price is at or below the strike, i.e. the put is in the money. */
  breachesStrike: boolean;
}

export const STRESS_TEST_PRESETS = [
  { label: "-10% Dip", shockBps: -1000 },
  { label: "-20% Selloff", shockBps: -2000 },
  { label: "-40% Crash", shockBps: -4000 },
] as const;

export const STRESS_TEST_MAX_SHOCK_BPS = 2000;
export const STRESS_TEST_DEFAULT_SHOCK_BPS = -2000;

/**
 * Applies the same deterministic put-payoff formula as scenario() in
 * src/lib/thetanuts/strategy.ts to a hypothetical settlement price picked interactively, instead
 * of the fixed down/flat/up cases. Pure arithmetic on the real selected candidate's strike,
 * quantity, and premium -- no network call, no LLM, no invented market data.
 */
export function computeStressOutcome(input: StressTestCandidateInput, shockBps: number): StressTestOutcome {
  const spot = new Decimal(input.spotUsd);
  const strike = new Decimal(input.strikeUsd);
  const quantity = new Decimal(input.quantityUnderlying);
  const premium = new Decimal(input.premiumUsd);
  const protectedValue = new Decimal(input.protectedValueUsd);
  const price = spot.mul(new Decimal(10_000).plus(shockBps)).div(10_000);
  const underlyingValue = protectedValue.mul(price).div(spot);
  const payoff = Decimal.max(strike.minus(price), 0).mul(quantity);
  const noProtectionFinal = underlyingValue;
  const goalGuardFinal = underlyingValue.plus(payoff).minus(premium);
  return {
    shockBps,
    settlementPriceUsd: price.toFixed(2),
    underlyingValueUsd: underlyingValue.toFixed(2),
    optionPayoffUsd: payoff.toFixed(2),
    premiumUsd: premium.toFixed(2),
    noProtectionFinalUsd: noProtectionFinal.toFixed(2),
    goalGuardFinalUsd: goalGuardFinal.toFixed(2),
    downsideAvoidedUsd: goalGuardFinal.minus(noProtectionFinal).toFixed(2),
    breachesStrike: !price.greaterThan(strike),
  };
}

/** The shock, in basis points off spot, at which the settlement price exactly equals the strike. */
export function strikeShockBps(strikeUsd: string, spotUsd: string): number {
  return new Decimal(strikeUsd).div(spotUsd).minus(1).mul(10_000).round().toNumber();
}

/** A slider floor that always keeps the strike marker comfortably on-track, even far OTM. */
export function minStressShockBps(strikeBps: number): number {
  return Math.min(-6000, Math.floor((strikeBps - 1000) / 100) * 100);
}
