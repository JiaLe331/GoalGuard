import { describe, expect, it } from "vitest";
import { describeCandidateDifference } from "./format";

const selected = { premiumUsd: "10.00", estimatedFloorUsd: "95.00", deadlineGapHours: 24 };

describe("describeCandidateDifference", () => {
  it("explains a cheaper but worse-timed alternative", () => {
    expect(describeCandidateDifference({ premiumUsd: "6.00", estimatedFloorUsd: "95.00", deadlineGapHours: 48 }, selected))
      .toBe("Expires 24h further past your deadline, but $4.00 cheaper.");
  });
  it("explains a closer-fitting but lower-floor alternative", () => {
    expect(describeCandidateDifference({ premiumUsd: "10.00", estimatedFloorUsd: "80.00", deadlineGapHours: 12 }, selected))
      .toBe("Expires 12h closer to your deadline, but a $15.00 lower floor.");
  });
  it("reports no meaningful difference when all three axes match", () => {
    expect(describeCandidateDifference({ ...selected }, selected)).toBe("Matches the selected plan on cost, floor, and timing.");
  });
});
