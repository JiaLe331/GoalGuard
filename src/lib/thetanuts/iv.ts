/**
 * Converts the pricing API's IV into an integer basis-point display value.
 * The current API returns decimal volatility (0.65 = 65%); the second branch
 * keeps older percentage-shaped payloads readable without exposing raw data.
 */
export function impliedVolatilityBps(value: number | undefined): number | null {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return null;
  const percentage = value <= 5 ? value * 100 : value;
  return Math.round(percentage * 100);
}
