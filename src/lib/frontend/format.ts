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
