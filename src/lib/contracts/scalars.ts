import { isAddress } from "ethers";
import { z } from "zod";

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const DECIMAL_PATTERN = /^(0|[1-9]\d*)(\.\d+)?$/;
const SIGNED_DECIMAL_PATTERN = /^-?(0|[1-9]\d*)(\.\d+)?$/;
const BASE_UNIT_PATTERN = /^(0|[1-9]\d*)$/;

function isIanaTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export const UUIDSchema = z.string().regex(UUID_V4_PATTERN, "Expected a UUID v4 string.");
export const ISODateSchema = z.string().regex(ISO_DATE_PATTERN, "Expected YYYY-MM-DD.").refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
}, "Expected a valid calendar date.");
export const ISODateTimeSchema = z.string().regex(ISO_DATETIME_PATTERN, "Expected a UTC ISO 8601 timestamp.").refine(
  (value) => !Number.isNaN(Date.parse(value)),
  "Expected a valid timestamp.",
);
export const IanaTimezoneSchema = z.string().trim().min(1).max(64).refine(isIanaTimezone, "Expected a valid IANA time-zone identifier.");
export const DecimalStringSchema = z.string().regex(DECIMAL_PATTERN, "Expected a normalized non-negative decimal string.");
export const SignedDecimalStringSchema = z.string().regex(
  SIGNED_DECIMAL_PATTERN,
  "Expected a normalized signed decimal string.",
);
export const BaseUnitStringSchema = z.string().regex(BASE_UNIT_PATTERN, "Expected a non-negative base-unit integer string.");
export const EvmAddressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/).refine(isAddress, "Expected a valid EVM address.");
export const TxHashSchema = z.string().regex(/^0x[0-9a-fA-F]{64}$/, "Expected a 32-byte transaction hash.");
export const Sha256Schema = z.string().regex(/^[0-9a-f]{64}$/, "Expected a lowercase SHA-256 digest.");
export const HexDataSchema = z.string().regex(/^0x[0-9a-fA-F]*$/, "Expected 0x-prefixed hexadecimal data.");
export const JsonValueSchema = z.json();

export type UUID = z.infer<typeof UUIDSchema>;
export type ISODate = z.infer<typeof ISODateSchema>;
export type ISODateTime = z.infer<typeof ISODateTimeSchema>;
export type IanaTimezone = z.infer<typeof IanaTimezoneSchema>;
export type DecimalString = z.infer<typeof DecimalStringSchema>;
export type SignedDecimalString = z.infer<typeof SignedDecimalStringSchema>;
export type BaseUnitString = z.infer<typeof BaseUnitStringSchema>;
export type EvmAddress = `0x${string}`;
export type TxHash = `0x${string}`;
export type JsonValue = z.infer<typeof JsonValueSchema>;
