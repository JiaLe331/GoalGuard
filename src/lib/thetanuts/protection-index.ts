import Decimal from "decimal.js";

import type { ProtectionChainEntry } from "@/lib/contracts";

const BASIS_POINTS = new Decimal(10_000);
const DAYS_IN_INDEX_WINDOW = new Decimal(30);
const USD_NOTIONAL = new Decimal(100);

export interface ProtectionIndexInput {
  chain: readonly ProtectionChainEntry[];
  protectedValueUsd: string;
  marketAsOf: string;
}

export interface ProtectionIndex {
  /** Median premium normalized to $100 of protected value for a 30-day term. */
  costPer100Usd30d: string | null;
  /** Median curated implied volatility, in basis points. */
  medianIvBps: number | null;
  /** Number of viable chain entries used for the cost median. */
  sampleSize: number;
}

function medianDecimal(values: Decimal[]): Decimal | null {
  if (values.length === 0) return null;
  const sorted = values.slice().sort((left, right) => left.comparedTo(right));
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle]!;
  return sorted[middle - 1]!.plus(sorted[middle]!).div(2);
}

function medianInteger(values: number[]): number | null {
  const median = medianDecimal(values.map((value) => new Decimal(value)));
  return median === null ? null : median.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Derives the dashboard's cost-of-safety metric without network or database I/O.
 * A chain entry's premium is scaled by its covered notional and time to expiry,
 * then the median keeps one unusual quote from dominating the headline.
 */
export function deriveProtectionIndex(input: ProtectionIndexInput): ProtectionIndex {
  const protectedValue = new Decimal(input.protectedValueUsd);
  const asOfMs = Date.parse(input.marketAsOf);
  if (!protectedValue.isFinite() || protectedValue.lte(0) || !Number.isFinite(asOfMs)) {
    return { costPer100Usd30d: null, medianIvBps: null, sampleSize: 0 };
  }

  const costs: Decimal[] = [];
  const ivs: number[] = [];
  for (const entry of input.chain) {
    const premium = new Decimal(entry.premiumUsd);
    const coverage = new Decimal(entry.goalCoverageBps);
    const expiryMs = Date.parse(entry.expiry);
    const durationDays = new Decimal(expiryMs - asOfMs).div(86_400_000);
    if (!premium.isFinite() || premium.lte(0) || coverage.lte(0) || durationDays.lte(0) || !durationDays.isFinite()) continue;

    const coveredNotional = protectedValue.mul(coverage).div(BASIS_POINTS);
    if (coveredNotional.lte(0)) continue;
    costs.push(premium.mul(USD_NOTIONAL).div(coveredNotional).mul(DAYS_IN_INDEX_WINDOW).div(durationDays));
    if (entry.impliedVolatilityBps !== null && Number.isInteger(entry.impliedVolatilityBps) && entry.impliedVolatilityBps >= 0) {
      ivs.push(entry.impliedVolatilityBps);
    }
  }

  const medianCost = medianDecimal(costs);
  return {
    costPer100Usd30d: medianCost === null ? null : medianCost.toDecimalPlaces(8, Decimal.ROUND_HALF_UP).toFixed(),
    medianIvBps: medianInteger(ivs),
    sampleSize: costs.length,
  };
}

