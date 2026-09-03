import Decimal from "decimal.js";

import type { ProtectionCandidate, ScoreBreakdown } from "@/lib/contracts";
import { IanaTimezoneSchema, ISODateTimeSchema } from "@/lib/contracts";

const BASIS_POINTS = 10_000;

export interface GoalTimingInput {
  protectThroughAt: string;
  fundsNeededAt: string;
  timezone: string;
  timingConfirmed: boolean;
}

export interface NormalizedGoalTiming extends GoalTimingInput {
  protectThroughMs: number;
  fundsNeededMs: number;
}

export interface GoalProtectionPolicy {
  version: "goal-protection-policy-v1";
  settlementTimingVerified: boolean;
  settlementTrigger: "factory_callback";
  settlementConfirmationAllowanceSeconds: number | null;
  maximumExpiryOverhangSeconds: number;
  maximumPreviewPremiumUsd: string;
  verifiedTriggerDelaySeconds?: number | null;
}

export const P0_GOAL_PROTECTION_POLICY: GoalProtectionPolicy = {
  version: "goal-protection-policy-v1",
  settlementTimingVerified: false,
  settlementTrigger: "factory_callback",
  settlementConfirmationAllowanceSeconds: null,
  maximumExpiryOverhangSeconds: 168 * 60 * 60,
  maximumPreviewPremiumUsd: "3",
};

export interface NormalizedProtectionFloor {
  coveredQuantityBaseUnits: string;
  coverageBps: number;
  requiredFloorUsd: string;
  protectedFloorAtExpiryUsd: string;
  expiryShortfallUsd: string;
}

export interface GoalDateAccessibility {
  settlementTimingStatus: "settlement_timing_not_verified" | "verified_accessible" | "verified_too_late";
  settlementAvailableAt: string | null;
  settlementConfirmationAllowanceSeconds: number | null;
  settlementLeadSeconds: number | null;
  accessibleFloorByGoalDateUsd: string | null;
  goalDateShortfallUsd: string | null;
  timingAccessible: boolean | null;
}

function decimalString(value: Decimal.Value) {
  return new Decimal(value).toFixed();
}

function decimalInput(value: Decimal.Value, name: string) {
  if (typeof value === "number") throw new RangeError(`${name} must be a decimal string.`);
  const parsed = new Decimal(value);
  if (!parsed.isFinite() || parsed.isNegative()) throw new RangeError(`${name} must be finite and non-negative.`);
  return parsed;
}

function clamp(value: Decimal, minimum = new Decimal(0), maximum = new Decimal(1)) {
  return Decimal.max(minimum, Decimal.min(maximum, value));
}

export function normalizeGoalTiming(input: GoalTimingInput, nowMs?: number): NormalizedGoalTiming {
  const protectThroughAt = ISODateTimeSchema.parse(input.protectThroughAt);
  const fundsNeededAt = ISODateTimeSchema.parse(input.fundsNeededAt);
  const timezone = IanaTimezoneSchema.parse(input.timezone);
  const protectThroughMs = Date.parse(protectThroughAt);
  const fundsNeededMs = Date.parse(fundsNeededAt);
  if (input.timingConfirmed && nowMs !== undefined && (protectThroughMs <= nowMs || fundsNeededMs <= nowMs)) {
    throw new RangeError("Confirmed goal timing must be in the future.");
  }
  if (input.timingConfirmed && protectThroughMs >= fundsNeededMs) {
    throw new RangeError("Protection must end before funds are needed.");
  }
  return { ...input, protectThroughAt, fundsNeededAt, timezone, protectThroughMs, fundsNeededMs };
}

export function calculateRequiredGoalQuantity(protectedValueUsd: Decimal.Value, spotPriceUsd: Decimal.Value, quantityDecimals: number): string {
  const value = decimalInput(protectedValueUsd, "Protected value");
  const spot = decimalInput(spotPriceUsd, "Spot price");
  if (!spot.isPositive() || !Number.isInteger(quantityDecimals) || quantityDecimals < 0) throw new RangeError("Spot price and quantity decimals must be valid positive values.");
  return value.div(spot).mul(new Decimal(10).pow(quantityDecimals)).toDecimalPlaces(0, Decimal.ROUND_CEIL).toFixed(0);
}

export function calculateNormalizedProtectionFloor(input: {
  protectedValueUsd: Decimal.Value;
  maxLossBps: number;
  requiredQuantityBaseUnits: string;
  optionQuantityBaseUnits: string;
  strikeUsd: Decimal.Value;
  premiumUsd: Decimal.Value;
  quantityDecimals: number;
}): NormalizedProtectionFloor {
  const protectedValue = decimalInput(input.protectedValueUsd, "Protected value");
  const strike = decimalInput(input.strikeUsd, "Strike");
  const premium = decimalInput(input.premiumUsd, "Premium");
  const requiredQuantity = BigInt(input.requiredQuantityBaseUnits);
  const optionQuantity = BigInt(input.optionQuantityBaseUnits);
  if (requiredQuantity <= 0n || optionQuantity <= 0n || !strike.isPositive() || input.maxLossBps < 0 || input.maxLossBps > 9999 || !Number.isInteger(input.quantityDecimals) || input.quantityDecimals < 0) {
    throw new RangeError("Protection floor inputs are invalid.");
  }
  const coveredQuantity = optionQuantity < requiredQuantity ? optionQuantity : requiredQuantity;
  const coverageBps = Number(coveredQuantity * BigInt(BASIS_POINTS) / requiredQuantity);
  const coveredQuantityDecimal = new Decimal(coveredQuantity.toString()).div(new Decimal(10).pow(input.quantityDecimals));
  const requiredFloor = protectedValue.mul(input.maxLossBps).div(BASIS_POINTS).sub(protectedValue).negated();
  const protectedFloor = Decimal.max(new Decimal(0), coveredQuantityDecimal.mul(strike).sub(premium));
  return {
    coveredQuantityBaseUnits: coveredQuantity.toString(),
    coverageBps: Math.min(BASIS_POINTS, coverageBps),
    requiredFloorUsd: decimalString(requiredFloor),
    protectedFloorAtExpiryUsd: decimalString(protectedFloor),
    expiryShortfallUsd: decimalString(Decimal.max(new Decimal(0), requiredFloor.sub(protectedFloor))),
  };
}

export function evaluateGoalDateAccessibility(input: {
  optionExpiry: string;
  protectThroughAt: string;
  fundsNeededAt: string;
  requiredFloorUsd: Decimal.Value;
  protectedFloorAtExpiryUsd: Decimal.Value;
  policy: GoalProtectionPolicy;
}): GoalDateAccessibility {
  const expiry = Date.parse(ISODateTimeSchema.parse(input.optionExpiry));
  const protectThrough = Date.parse(ISODateTimeSchema.parse(input.protectThroughAt));
  const fundsNeeded = Date.parse(ISODateTimeSchema.parse(input.fundsNeededAt));
  if (!input.policy.settlementTimingVerified || input.policy.settlementConfirmationAllowanceSeconds === null) {
    return { settlementTimingStatus: "settlement_timing_not_verified", settlementAvailableAt: null, settlementConfirmationAllowanceSeconds: null, settlementLeadSeconds: null, accessibleFloorByGoalDateUsd: null, goalDateShortfallUsd: null, timingAccessible: null };
  }
  const triggerDelaySeconds = input.policy.verifiedTriggerDelaySeconds ?? 0;
  if (!Number.isInteger(triggerDelaySeconds) || triggerDelaySeconds < 0) throw new RangeError("Verified trigger delay must be a non-negative integer.");
  const availableMs = expiry + (triggerDelaySeconds + input.policy.settlementConfirmationAllowanceSeconds) * 1000;
  const timingAccessible = expiry >= protectThrough && availableMs <= fundsNeeded;
  const requiredFloor = decimalInput(input.requiredFloorUsd, "Required floor");
  const protectedFloor = decimalInput(input.protectedFloorAtExpiryUsd, "Protected expiry floor");
  const accessibleFloor = timingAccessible ? protectedFloor : new Decimal(0);
  return {
    settlementTimingStatus: timingAccessible ? "verified_accessible" : "verified_too_late",
    settlementAvailableAt: new Date(availableMs).toISOString(),
    settlementConfirmationAllowanceSeconds: input.policy.settlementConfirmationAllowanceSeconds,
    settlementLeadSeconds: Math.max(0, Math.floor((availableMs - expiry) / 1000)),
    accessibleFloorByGoalDateUsd: decimalString(accessibleFloor),
    goalDateShortfallUsd: decimalString(Decimal.max(new Decimal(0), requiredFloor.sub(accessibleFloor))),
    timingAccessible,
  };
}

export function calculateGoalProtectionScore(input: {
  settlementTimingStatus: GoalDateAccessibility["settlementTimingStatus"];
  timingAccessible: boolean | null;
  goalDateShortfallUsd: Decimal.Value | null;
  requiredFloorUsd: Decimal.Value;
  coverageBps: number;
  premiumUsd: Decimal.Value;
  effectiveBudgetUsd: Decimal.Value;
  optionExpiry: string;
  protectThroughAt: string;
  fundsNeededAt: string;
  settlementLeadSeconds: number;
}): { protectionScore: number; scoreBreakdown: ScoreBreakdown } | null {
  if (input.settlementTimingStatus !== "verified_accessible" || input.timingAccessible !== true || input.goalDateShortfallUsd === null) return null;
  const requiredFloor = decimalInput(input.requiredFloorUsd, "Required floor");
  const shortfall = decimalInput(input.goalDateShortfallUsd, "Goal-date shortfall");
  const budget = decimalInput(input.effectiveBudgetUsd, "Effective budget");
  if (!requiredFloor.isPositive() || !budget.isPositive() || input.coverageBps < 0 || input.coverageBps > BASIS_POINTS) return null;
  const expiryOverhang = Date.parse(input.optionExpiry) - Date.parse(input.protectThroughAt);
  const expiryWindow = Date.parse(input.fundsNeededAt) - (input.settlementLeadSeconds * 1000) - Date.parse(input.protectThroughAt);
  const deadlineFit = expiryWindow <= 0 ? (expiryOverhang === 0 ? new Decimal(1) : new Decimal(0)) : clamp(new Decimal(1).sub(new Decimal(expiryOverhang).div(expiryWindow)));
  const floorAttainment = clamp(new Decimal(1).sub(shortfall.div(requiredFloor)));
  const budgetFit = clamp(new Decimal(1).sub(decimalInput(input.premiumUsd, "Premium").div(budget)));
  const components = {
    floorAttainmentBps: floorAttainment.mul(BASIS_POINTS).toDecimalPlaces(0, Decimal.ROUND_FLOOR).toNumber(),
    coverageBps: input.coverageBps,
    deadlineFitBps: deadlineFit.mul(BASIS_POINTS).toDecimalPlaces(0, Decimal.ROUND_FLOOR).toNumber(),
    budgetFitBps: budgetFit.mul(BASIS_POINTS).toDecimalPlaces(0, Decimal.ROUND_FLOOR).toNumber(),
  } satisfies ScoreBreakdown;
  const rawScore = new Decimal("0.50").mul(floorAttainment).add(new Decimal("0.30").mul(new Decimal(input.coverageBps).div(BASIS_POINTS))).add(new Decimal("0.10").mul(deadlineFit)).add(new Decimal("0.10").mul(budgetFit));
  return { protectionScore: rawScore.mul(100).toDecimalPlaces(0, Decimal.ROUND_FLOOR).toNumber(), scoreBreakdown: components };
}

type ComparableCandidate = Pick<ProtectionCandidate, "status" | "settlementTimingStatus" | "goalDateShortfallUsd" | "expiryShortfallUsd" | "goalCoverageBps" | "premiumUsd" | "expiryOverhangSeconds" | "availableQuantityBaseUnits" | "protocolOrderId">;

export function compareProtectionCandidates(a: ComparableCandidate, b: ComparableCandidate): number {
  const validity = (candidate: ComparableCandidate) => ["viable", "selected"].includes(candidate.status) ? 0 : 1;
  const accessibility = (candidate: ComparableCandidate) => candidate.settlementTimingStatus === "verified_accessible" ? 0 : candidate.settlementTimingStatus === "settlement_timing_not_verified" ? 1 : 2;
  const compareDecimal = (left: string, right: string) => new Decimal(left).comparedTo(new Decimal(right));
  const availableA = BigInt(a.availableQuantityBaseUnits ?? "0");
  const availableB = BigInt(b.availableQuantityBaseUnits ?? "0");
  const liquidity = availableB > availableA ? -1 : availableB < availableA ? 1 : 0;
  const tupleComparison = [
    validity(a) - validity(b),
    accessibility(a) - accessibility(b),
    compareDecimal(a.goalDateShortfallUsd ?? a.expiryShortfallUsd, b.goalDateShortfallUsd ?? b.expiryShortfallUsd),
    b.goalCoverageBps - a.goalCoverageBps,
    compareDecimal(a.premiumUsd, b.premiumUsd),
    a.expiryOverhangSeconds - b.expiryOverhangSeconds,
    liquidity,
    (a.protocolOrderId ?? "").localeCompare(b.protocolOrderId ?? ""),
  ];
  return tupleComparison.find((value) => value !== 0) ?? 0;
}

export class ProtectionInvariantError extends Error {
  override name = "ProtectionInvariantError";
}

export function assertSelectableCandidate(candidate: Pick<ProtectionCandidate, "status" | "rejectionReasons" | "expiry" | "coverageMode" | "goalCoverageBps" | "expiryShortfallUsd" | "premiumUsd" | "effectiveBudgetUsd" | "settlementTimingStatus" | "goalAttainment">, protectThroughAt: string): void {
  if (!["viable", "selected"].includes(candidate.status) || candidate.rejectionReasons.length > 0) throw new ProtectionInvariantError("The candidate failed a deterministic selection check.");
  if (Date.parse(candidate.expiry) < Date.parse(protectThroughAt)) throw new ProtectionInvariantError("The candidate expires before the requested protection cutoff.");
  if (new Decimal(candidate.premiumUsd).greaterThan(candidate.effectiveBudgetUsd)) throw new ProtectionInvariantError("The candidate exceeds the effective protection budget.");
  if (candidate.coverageMode === "full" && (candidate.goalCoverageBps !== BASIS_POINTS || candidate.expiryShortfallUsd !== "0")) throw new ProtectionInvariantError("The full candidate does not satisfy the expiry protection floor.");
  if (candidate.settlementTimingStatus === "settlement_timing_not_verified" && candidate.goalAttainment !== "settlement_timing_not_verified") throw new ProtectionInvariantError("The candidate has an inconsistent settlement timing status.");
}
