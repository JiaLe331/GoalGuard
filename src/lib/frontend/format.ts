import Decimal from "decimal.js";

export function formatUsd(value: string) {
  const fixed = new Decimal(value).toDecimalPlaces(2).toFixed(2);
  const [whole, fraction] = fixed.split(".");
  const grouped = whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `$${grouped}.${fraction}`;
}

export function formatPercentFromBps(value: number) {
  return `${new Decimal(value).div(100).toDecimalPlaces(2).toString()}%`;
}

export function formatDate(value: string, options: Intl.DateTimeFormatOptions = {}) {
  const date = value.length === 10 ? new Date(`${value}T12:00:00.000Z`) : new Date(value);
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  }).format(date);
}

export function shortenAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function formatBaseUnits(value: string, decimals: number, maximumFractionDigits = 6) {
  const amount = new Decimal(value).div(new Decimal(10).pow(decimals));
  return amount.toDecimalPlaces(maximumFractionDigits).toString();
}

export function baseTransactionUrl(hash: string) {
  return `https://basescan.org/tx/${hash}`;
}

export function secondsUntil(value: string, now = Date.now()) {
  return Math.max(0, Math.ceil((Date.parse(value) - now) / 1000));
}

export function formatCountdown(seconds: number) {
  if (seconds <= 0) return "Expired";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

// Explains why an alternative candidate wasn't selected, on the same three axes rankAndSelect()
// (src/lib/thetanuts/strategy.ts) tie-breaks on: deadline fit, floor, then premium.
export function describeCandidateDifference(
  alternative: { premiumUsd: string; estimatedFloorUsd: string; deadlineGapHours: number },
  selected: { premiumUsd: string; estimatedFloorUsd: string; deadlineGapHours: number },
) {
  const parts: string[] = [];
  const gapDiff = alternative.deadlineGapHours - selected.deadlineGapHours;
  if (gapDiff !== 0) parts.push(`expires ${Math.abs(gapDiff)}h ${gapDiff < 0 ? "closer to" : "further past"} your deadline`);
  const floorDiff = new Decimal(alternative.estimatedFloorUsd).minus(selected.estimatedFloorUsd);
  if (!floorDiff.isZero()) parts.push(`a ${formatUsd(floorDiff.abs().toString())} ${floorDiff.isNegative() ? "lower" : "higher"} floor`);
  const premiumDiff = new Decimal(alternative.premiumUsd).minus(selected.premiumUsd);
  if (!premiumDiff.isZero()) parts.push(`${formatUsd(premiumDiff.abs().toString())} ${premiumDiff.isNegative() ? "cheaper" : "more expensive"}`);
  if (!parts.length) return "Matches the selected plan on cost, floor, and timing.";
  const [first, ...rest] = parts;
  const sentence = rest.length ? `${first}, but ${rest.join(" and ")}` : first!;
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".";
}
