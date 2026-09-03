import { describe, expect, it } from "vitest";

import {
  calculateGoalProtectionScore,
  calculateNormalizedProtectionFloor,
  calculateRequiredGoalQuantity,
  compareProtectionCandidates,
  evaluateGoalDateAccessibility,
  normalizeGoalTiming,
  P0_GOAL_PROTECTION_POLICY,
} from "./scoring";

describe("P0 goal protection evaluation", () => {
  it("calculates required quantity with contract-unit ceiling and caps overhedging", () => {
    expect(calculateRequiredGoalQuantity("1200", "3000", 6)).toBe("400000");
    expect(calculateNormalizedProtectionFloor({ protectedValueUsd: "1200", maxLossBps: 500, requiredQuantityBaseUnits: "400000", optionQuantityBaseUnits: "600000", strikeUsd: "3000", premiumUsd: "3", quantityDecimals: 6 })).toEqual({
      coveredQuantityBaseUnits: "400000",
      coverageBps: 10000,
      requiredFloorUsd: "1140",
      protectedFloorAtExpiryUsd: "1197",
      expiryShortfallUsd: "0",
    });
  });

  it("uses the same normalized floor for partial coverage and clamps it at zero", () => {
    expect(calculateNormalizedProtectionFloor({ protectedValueUsd: "1200", maxLossBps: 500, requiredQuantityBaseUnits: "400000", optionQuantityBaseUnits: "200000", strikeUsd: "3000", premiumUsd: "3", quantityDecimals: 6 })).toMatchObject({ coverageBps: 5000, protectedFloorAtExpiryUsd: "597", expiryShortfallUsd: "543" });
    expect(calculateNormalizedProtectionFloor({ protectedValueUsd: "1", maxLossBps: 500, requiredQuantityBaseUnits: "1000000", optionQuantityBaseUnits: "1000000", strikeUsd: "1", premiumUsd: "2", quantityDecimals: 6 }).protectedFloorAtExpiryUsd).toBe("0");
  });

  it("keeps factory-callback settlement unverified regardless of expiry spacing", () => {
    for (const fundsNeededAt of ["2026-10-01T00:00:00.000Z", "2026-10-02T00:00:00.000Z", "2027-10-01T00:00:00.000Z"]) {
      expect(evaluateGoalDateAccessibility({ optionExpiry: "2026-10-01T00:00:00.000Z", protectThroughAt: "2026-09-30T23:59:59.999Z", fundsNeededAt, requiredFloorUsd: "1140", protectedFloorAtExpiryUsd: "1197", policy: P0_GOAL_PROTECTION_POLICY })).toEqual({ settlementTimingStatus: "settlement_timing_not_verified", settlementAvailableAt: null, settlementConfirmationAllowanceSeconds: null, settlementLeadSeconds: null, accessibleFloorByGoalDateUsd: null, goalDateShortfallUsd: null, timingAccessible: null });
    }
  });

  it("does not turn an arbitrary buffer into verified access", () => {
    const policy = { ...P0_GOAL_PROTECTION_POLICY, settlementConfirmationAllowanceSeconds: null, verifiedTriggerDelaySeconds: 86_400 };
    const result = evaluateGoalDateAccessibility({ optionExpiry: "2026-10-01T00:00:00.000Z", protectThroughAt: "2026-09-30T23:59:59.999Z", fundsNeededAt: "2026-10-03T00:00:00.000Z", requiredFloorUsd: "1140", protectedFloorAtExpiryUsd: "1197", policy });
    expect(result.settlementTimingStatus).toBe("settlement_timing_not_verified");
    expect(result.accessibleFloorByGoalDateUsd).toBeNull();
  });

  it("supports a future verified policy only at the exact confirmation boundary", () => {
    const policy = { ...P0_GOAL_PROTECTION_POLICY, settlementTimingVerified: true, settlementConfirmationAllowanceSeconds: 60, verifiedTriggerDelaySeconds: 60 };
    const input = { optionExpiry: "2026-10-01T00:00:00.000Z", protectThroughAt: "2026-09-30T23:59:59.999Z", requiredFloorUsd: "1140", protectedFloorAtExpiryUsd: "1197", policy };
    expect(evaluateGoalDateAccessibility({ ...input, fundsNeededAt: "2026-10-01T00:02:00.000Z" })).toMatchObject({ settlementTimingStatus: "verified_accessible", timingAccessible: true, accessibleFloorByGoalDateUsd: "1197", goalDateShortfallUsd: "0", settlementLeadSeconds: 120 });
    expect(evaluateGoalDateAccessibility({ ...input, fundsNeededAt: "2026-10-01T00:01:59.000Z" })).toMatchObject({ settlementTimingStatus: "verified_too_late", timingAccessible: false, accessibleFloorByGoalDateUsd: "0", goalDateShortfallUsd: "1140" });
  });

  it("does not publish a score for unverified or inaccessible candidates and rounds verified components down", () => {
    expect(calculateGoalProtectionScore({ settlementTimingStatus: "settlement_timing_not_verified", timingAccessible: null, goalDateShortfallUsd: null, requiredFloorUsd: "1140", coverageBps: 10000, premiumUsd: "3", effectiveBudgetUsd: "3", optionExpiry: "2026-10-01T00:00:00.000Z", protectThroughAt: "2026-09-30T23:59:59.999Z", fundsNeededAt: "2026-10-01T00:02:00.000Z", settlementLeadSeconds: 120 })).toBeNull();
    const result = calculateGoalProtectionScore({ settlementTimingStatus: "verified_accessible", timingAccessible: true, goalDateShortfallUsd: "0", requiredFloorUsd: "1140", coverageBps: 10000, premiumUsd: "1", effectiveBudgetUsd: "3", optionExpiry: "2026-10-01T00:00:00.000Z", protectThroughAt: "2026-09-30T23:59:59.999Z", fundsNeededAt: "2026-10-01T00:02:00.000Z", settlementLeadSeconds: 120 });
    expect(result?.protectionScore).toBeGreaterThan(0);
    expect(result?.scoreBreakdown.floorAttainmentBps).toBe(10000);
  });

  it("ranks hard accessibility and shortfall before premium and stable liquidity", () => {
    const base = { status: "viable" as const, expiryShortfallUsd: "0", goalCoverageBps: 10000, premiumUsd: "1", expiryOverhangSeconds: 10, availableQuantityBaseUnits: "100", protocolOrderId: "b" };
    const unverified = { ...base, settlementTimingStatus: "settlement_timing_not_verified" as const, goalDateShortfallUsd: null };
    const accessible = { ...base, settlementTimingStatus: "verified_accessible" as const, goalDateShortfallUsd: "100" };
    expect(compareProtectionCandidates(accessible, unverified)).toBeLessThan(0);
    expect(compareProtectionCandidates({ ...accessible, goalDateShortfallUsd: "0", premiumUsd: "2" }, { ...accessible, goalDateShortfallUsd: "1", premiumUsd: "1" })).toBeLessThan(0);
    expect(compareProtectionCandidates({ ...accessible, premiumUsd: "1", protocolOrderId: "a" }, { ...accessible, premiumUsd: "1", protocolOrderId: "b" })).toBeLessThan(0);
  });

  it("validates confirmed timing and IANA zones without changing timestamps", () => {
    expect(normalizeGoalTiming({ protectThroughAt: "2026-09-30T23:59:59.999Z", fundsNeededAt: "2026-10-01T00:00:00.000Z", timezone: "Asia/Kuala_Lumpur", timingConfirmed: true }, Date.parse("2026-09-01T00:00:00.000Z")).protectThroughAt).toBe("2026-09-30T23:59:59.999Z");
    expect(() => normalizeGoalTiming({ protectThroughAt: "2026-09-30T23:59:59.999Z", fundsNeededAt: "2026-10-01T00:00:00.000Z", timezone: "Not/AZone", timingConfirmed: true })).toThrow();
  });
});
