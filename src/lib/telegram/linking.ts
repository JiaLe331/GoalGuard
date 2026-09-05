import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";

import { getTelegramWebConfiguration } from "@/lib/config/env";
import { TelegramLinkTokenSchema } from "./contracts";
import type { TelegramRepository } from "./repository";

export type TelegramWebConfiguration = NonNullable<ReturnType<typeof getTelegramWebConfiguration>>;

export function isIanaTimezone(value: string) {
  const timezone = value.trim();
  if (!timezone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

export function normalizeTelegramTimezone(value: string | undefined) {
  const timezone = value?.trim() ?? "";
  return isIanaTimezone(timezone) ? timezone : "UTC";
}

export function hashTelegramLinkToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateTelegramLinkToken(randomBytesSource: (size: number) => Uint8Array = randomBytes) {
  const token = Buffer.from(randomBytesSource(32)).toString("base64url");
  if (token.length !== 43 || !/^[A-Za-z0-9_-]+$/.test(token)) throw new Error("Could not generate a valid Telegram link token.");
  return token;
}

export function buildTelegramDeepLink(botUsername: string, token: string) {
  if (!/^[A-Za-z][A-Za-z0-9_]{4,31}bot$/i.test(botUsername)) throw new Error("Telegram bot username is invalid.");
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error("Telegram link token is invalid.");
  return `https://t.me/${botUsername}?start=${token}`;
}

export async function createTelegramLink({
  ownerSessionHash,
  timezone,
  repository,
  configuration,
  now = new Date(),
  randomBytesSource,
}: {
  ownerSessionHash: string;
  timezone?: string;
  repository: TelegramRepository;
  configuration: TelegramWebConfiguration;
  now?: Date;
  randomBytesSource?: (size: number) => Uint8Array;
}) {
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + configuration.linkTtlSeconds * 1000).toISOString();
  const token = generateTelegramLinkToken(randomBytesSource);
  await repository.createTelegramLinkToken(TelegramLinkTokenSchema.parse({
    id: randomUUID(),
    ownerSessionHash,
    tokenHash: hashTelegramLinkToken(token),
    timezone: normalizeTelegramTimezone(timezone),
    status: "pending",
    expiresAt,
    consumedAt: null,
    createdAt,
    updatedAt: createdAt,
  }));
  return { deepLink: buildTelegramDeepLink(configuration.botUsername, token), expiresAt };
}
