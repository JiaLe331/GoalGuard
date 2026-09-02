import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

import {
  contractsForPremium,
  decimalFromBaseUnits,
  decimalToBaseUnits,
  premiumForContracts,
  putCollateralForContracts,
  underlyingFromContractBaseUnits,
  usdFromPriceBaseUnits,
} from "./units";

describe("Thetanuts unit conversions", () => {
  it("uses the SDK's 8-decimal price and 6-decimal put contract units exactly", () => {
    expect(usdFromPriceBaseUnits(300_000_000_000n).toFixed()).toBe("3000");
    expect(underlyingFromContractBaseUnits(400_000n).toFixed()).toBe("0.4");
    expect(contractsForPremium(3_000_000n, 750_000_000n)).toBe(400_000n);
    expect(premiumForContracts(400_000n, 750_000_000n)).toBe(3_000_000n);
    expect(putCollateralForContracts(300_000_000_000n, 400_000n)).toBe(1_200_000_000n);
  });

  it("rounds full premium sizing upward and preserves base-unit precision", () => {
    expect(premiumForContracts(1n, 1n)).toBe(1n);
    expect(decimalToBaseUnits(new Decimal("1.2345678"), 6)).toBe(1_234_567n);
    expect(decimalFromBaseUnits(1_234_567n, 6).toFixed()).toBe("1.234567");
  });

  it("rejects unsafe numeric, exponent, NaN, and negative inputs", () => {
    for (const value of [1.2, "1e3", "+1", "01", "NaN", new Decimal(-1)] as const) {
      expect(() => decimalToBaseUnits(value, 6)).toThrow();
    }
    expect(() => contractsForPremium(1n, 0n)).toThrow();
    expect(() => putCollateralForContracts(0n, 1n)).toThrow();
  });
});
