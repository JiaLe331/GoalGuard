import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

export function isTelegramWebhookSecretValid(expected: string, provided: string | null) {
  const expectedDigest = createHash("sha256").update(expected, "utf8").digest();
  const providedDigest = createHash("sha256").update(provided ?? "", "utf8").digest();
  return timingSafeEqual(expectedDigest, providedDigest);
}
