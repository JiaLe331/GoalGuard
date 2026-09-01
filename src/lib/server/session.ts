import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import { readServerEnvironment } from "@/lib/config/env";

export const SESSION_COOKIE = "goalguard_session";

export function hashSession(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export async function getAnonymousOwnerSession() {
  const store = await cookies();
  let raw = store.get(SESSION_COOKIE)?.value;
  if (!raw || !/^[0-9a-f]{64}$/.test(raw)) {
    raw = randomBytes(32).toString("hex");
    const secure = readServerEnvironment().NEXT_PUBLIC_APP_URL.startsWith("https://");
    store.set(SESSION_COOKIE, raw, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30, priority: "high" });
  }
  return { ownerSessionHash: hashSession(raw) };
}

export function assertSameOrigin(request: Request) {
  const expected = new URL(readServerEnvironment().NEXT_PUBLIC_APP_URL).origin;
  const origin = request.headers.get("origin");
  if (origin !== expected) throw new RouteError("VALIDATION_ERROR", "Request origin is not allowed.", 403, false);
}

// Local definition avoids a dependency cycle with the route response helpers.
export class RouteError extends Error {
  constructor(readonly code: string, message: string, readonly status: number, readonly retryable: boolean) { super(message); }
}
