import { createHash } from "node:crypto";
export function sha256(value: string) { return createHash("sha256").update(value, "utf8").digest("hex"); }
export function hashJson(value: unknown) { return sha256(JSON.stringify(value)); }
