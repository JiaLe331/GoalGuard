import Decimal from "decimal.js";

/**
 * The official Thetanuts OptionBook SDK represents USD strikes and per-contract
 * prices with eight decimals, and USDC-settled put contract quantities with six.
 * Keep these conversions here so strategy code never infers protocol units.
 */
export const THETANUTS_PRICE_DECIMALS = 8;
export const USDC_DECIMALS = 6;

const priceScale = 10n ** BigInt(THETANUTS_PRICE_DECIMALS);

export function decimalFromBaseUnits(value: bigint, decimals: number): Decimal {
  if (value < 0n || !Number.isInteger(decimals) || decimals < 0) throw new RangeError("Base-unit values and decimals must be non-negative integers.");
  return new Decimal(value.toString()).div(new Decimal(10).pow(decimals));
}

export function decimalToBaseUnits(value: Decimal.Value, decimals: number, rounding: Decimal.Rounding = Decimal.ROUND_FLOOR): bigint {
  if (typeof value === "number" || typeof value === "string" && !/^(0|[1-9]\d*)(\.\d+)?$/.test(value)) throw new RangeError("Decimal strings must be normalized and numbers are not accepted.");
  const decimal = new Decimal(value);
  if (!decimal.isFinite() || decimal.isNegative() || !Number.isInteger(decimals) || decimals < 0) throw new RangeError("Decimal values must be finite and non-negative.");
  return BigInt(decimal.mul(new Decimal(10).pow(decimals)).toDecimalPlaces(0, rounding).toFixed(0));
}

/**
 * Mirrors OptionBook.calculateNumContracts. The 8-decimal price scale is a fixed
 * protocol convention independent of which collateral token backs the order;
 * premiumBaseUnits and the returned contract count share whatever decimal scale
 * the caller resolved for that order's actual collateral token.
 */
export function contractsForPremium(premiumBaseUnits: bigint, pricePerContract: bigint): bigint {
  if (premiumBaseUnits < 0n || pricePerContract <= 0n) throw new RangeError("Premium must be non-negative and price must be positive.");
  return premiumBaseUnits * priceScale / pricePerContract;
}

/** Inverse of OptionBook.calculateNumContracts, rounded up for full coverage. */
export function premiumForContracts(contractsBaseUnits: bigint, pricePerContract: bigint): bigint {
  if (contractsBaseUnits < 0n || pricePerContract <= 0n) throw new RangeError("Contracts must be non-negative and price must be positive.");
  return (contractsBaseUnits * pricePerContract + priceScale - 1n) / priceScale;
}

/**
 * The SDK's put collateral formula: strike * contracts / 10^8. Denominated in
 * whichever collateral token's base units the contracts figure was resolved in.
 */
export function putCollateralForContracts(strikeBaseUnits: bigint, contractsBaseUnits: bigint): bigint {
  if (strikeBaseUnits <= 0n || contractsBaseUnits < 0n) throw new RangeError("Strike must be positive and contracts must be non-negative.");
  return strikeBaseUnits * contractsBaseUnits / priceScale;
}

export function usdFromPriceBaseUnits(value: bigint): Decimal {
  return decimalFromBaseUnits(value, THETANUTS_PRICE_DECIMALS);
}

/**
 * Contract/collateral quantities share the decimal scale of whatever
 * collateral token backed the order (USDC today; a physically-settled
 * order may use a different collateral token). Callers must resolve and
 * pass that token's actual decimals rather than assuming USDC_DECIMALS.
 */
export function underlyingFromContractBaseUnits(value: bigint, decimals: number): Decimal {
  return decimalFromBaseUnits(value, decimals);
}
