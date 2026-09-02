import { describe, expect, it } from "vitest";

import { calculateGoalCoverageBps } from "./coverage";

describe("calculateGoalCoverageBps", () => {
  it.each([
    ["400000", "400000", 10000],
    ["800000", "400000", 10000],
    ["200000", "400000", 5000],
    ["1", "3", 3333],
    ["0", "400000", 0],
  ])("calculates capped, rounded-down coverage for %s / %s", (candidate, required, expected) => {
    expect(calculateGoalCoverageBps(candidate, required)).toBe(expected);
  });

  it.each([
    ["1", "0"],
    ["-1", "1"],
    ["1.5", "1"],
    ["1e3", "1"],
    ["NaN", "1"],
  ])("rejects unsafe or invalid base-unit quantities", (candidate, required) => {
    expect(() => calculateGoalCoverageBps(candidate, required)).toThrow();
  });
});
