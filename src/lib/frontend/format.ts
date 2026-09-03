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

function zonedParts(timestamp: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(timestamp));
  return Object.fromEntries(parts.filter(({ type }) => type !== "literal").map(({ type, value }) => [type, value]));
}

function localCalendarDateToUtc(date: string, timeZone: string, hour: number, minute: number, second: number, millisecond: number) {
  const [year, month, day] = date.split("-").map(Number);
  const naive = Date.UTC(year!, month! - 1, day, hour, minute, second, millisecond);
  const parts = zonedParts(naive, timeZone);
  const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second), millisecond);
  return new Date(naive - (represented - naive)).toISOString();
}

export function formatDateInput(value: string, timeZone: string) {
  const parts = zonedParts(Date.parse(value), timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function localCalendarDayStartUtc(date: string, timeZone: string) {
  return localCalendarDateToUtc(date, timeZone, 0, 0, 0, 0);
}

export function localCalendarDayEndUtc(date: string, timeZone: string) {
  return localCalendarDateToUtc(date, timeZone, 23, 59, 59, 999);
}

export function formatDateTime(value: string, timeZone: string) {
  return formatDate(value, { timeZone, hour: "numeric", minute: "2-digit", timeZoneName: "short" });
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
