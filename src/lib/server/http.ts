import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

import { ApiErrorResponseSchema, type ApiErrorCode } from "@/lib/contracts";
import { RepositoryConflictError, RepositoryNotFoundError } from "@/lib/db/repository";
import { RouteError } from "./session";

export class ApiRouteError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly status: number,
    readonly retryable = false,
    readonly details: unknown = null,
  ) { super(message); }
}

export function apiMeta(requestId: string = randomUUID()) { return { requestId, timestamp: new Date().toISOString() }; }

export async function parseBody<T>(request: Request, schema: ZodType<T>) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new ApiRouteError("VALIDATION_ERROR", "Content-Type must be application/json.", 400);
  let value: unknown;
  try { value = await request.json(); } catch { throw new ApiRouteError("VALIDATION_ERROR", "Request body must contain valid JSON.", 400); }
  return schema.parse(value);
}

function fieldErrors(error: ZodError) {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "request";
    (result[key] ??= []).push(issue.message);
  }
  return result;
}

function mapped(error: unknown): { code: ApiErrorCode; message: string; status: number; retryable: boolean; details: unknown; fields: Record<string, string[]> } {
  if (error instanceof ZodError) return { code: "VALIDATION_ERROR", message: "The request did not match the GoalGuard contract.", status: 400, retryable: false, details: null, fields: fieldErrors(error) };
  if (error instanceof ApiRouteError) return { code: error.code, message: error.message, status: error.status, retryable: error.retryable, details: error.details, fields: {} };
  if (error instanceof RouteError) return { code: error.code as ApiErrorCode, message: error.message, status: error.status, retryable: error.retryable, details: null, fields: {} };
  if (error instanceof RepositoryNotFoundError) return { code: "NOT_FOUND", message: "The requested record was not found.", status: 404, retryable: false, details: null, fields: {} };
  if (error instanceof RepositoryConflictError) return { code: "CONFLICT", message: error.message, status: 409, retryable: false, details: null, fields: {} };
  console.error("Unhandled GoalGuard route error", error);
  return { code: "INTERNAL_ERROR", message: "GoalGuard could not complete the request.", status: 500, retryable: true, details: null, fields: {} };
}

export function jsonSuccess<T>(schema: ZodType<T>, value: T, status = 200) {
  return NextResponse.json(schema.parse(value), { status, headers: { "Cache-Control": "no-store" } });
}

export function jsonError(error: unknown, requestId: string) {
  const value = mapped(error);
  const payload = ApiErrorResponseSchema.parse({ error: { code: value.code, message: value.message, retryable: value.retryable, fieldErrors: value.fields, details: value.details }, meta: apiMeta(requestId) });
  return NextResponse.json(payload, { status: value.status, headers: { "Cache-Control": "no-store" } });
}

export async function route<T>(handler: (requestId: string) => Promise<T | Response>) {
  const requestId = randomUUID();
  try { return await handler(requestId); } catch (error) { return jsonError(error, requestId); }
}

export function requireIdempotencyKey(request: Request) {
  const value = request.headers.get("idempotency-key")?.trim();
  if (!value || value.length < 16 || value.length > 128) throw new ApiRouteError("VALIDATION_ERROR", "Idempotency-Key must contain 16 to 128 characters.", 400);
  return value;
}
