import { describe, expect, it } from "vitest";

import { categorizeRejection, groupRejections } from "./market";

describe("market rejection grouping", () => {
  it("maps the deterministic strategy reasons to plain categories", () => {
    expect(categorizeRejection(["Full goal coverage exceeds the protection-cost limit."])).toBe("too_costly");
    expect(categorizeRejection(["The option expires before the goal deadline."])).toBe("expiry");
    expect(categorizeRejection(["The expiry is more than 168 hours after the deadline."])).toBe("deadline_gap");
    expect(categorizeRejection(["The order has no available liquidity."])).toBe("liquidity");
    expect(categorizeRejection(["The order could not be previewed as fillable."])).toBe("not_fillable");
  });

  it("returns groups in a stable display order", () => {
    const groups = groupRejections([
      { protocolOrderId: "expiry", strikeUsd: null, expiry: null, premiumUsd: null, reasons: ["The option expiry is invalid."] },
      { protocolOrderId: "cost", strikeUsd: null, expiry: null, premiumUsd: null, reasons: ["The preview exceeds the protection-cost cap."] },
      { protocolOrderId: "liq", strikeUsd: null, expiry: null, premiumUsd: null, reasons: ["The order has no available liquidity."] },
    ]);
    expect(groups.map(({ category, entries }) => [category, entries.length])).toEqual([["too_costly", 1], ["expiry", 1], ["liquidity", 1]]);
  });
});

