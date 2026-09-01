import "server-only";
import OpenAI from "openai";
import type { ZodType } from "zod";
import { getGonkaConfiguration } from "@/lib/config/env";

export type GonkaSmokeResult = { status: "unconfigured"; model: null; requestId: null } | { status: "ready" | "degraded"; model: string; requestId: string | null };
export class GonkaCallError extends Error { constructor(message: string, readonly requestId: string | null = null, readonly causeValue?: unknown) { super(message); } }
export interface GonkaJsonResult<T> { data: T; requestId: string; model: string; raw: unknown; latencyMs: number; }

export async function callGonkaJson<T>({ apiKey, baseUrl, model, requestIdHeader, system, input, schema }: { apiKey: string; baseUrl: string; model: string; requestIdHeader: string; system: string; input: unknown; schema: ZodType<T>; }): Promise<GonkaJsonResult<T>> {
  const client = new OpenAI({ apiKey, baseURL: baseUrl, timeout: 25_000, maxRetries: 1 });
  const started = Date.now();
  let repair: string | null = null;
  let lastRequestId: string | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await client.chat.completions.create({ model, messages: [
        { role: "system", content: system }, { role: "user", content: JSON.stringify(input) },
        ...(repair ? [{ role: "user" as const, content: repair }] : []),
      ], response_format: { type: "json_object" }, temperature: 0 }).withResponse();
      lastRequestId = result.response.headers.get(requestIdHeader) ?? result.response.headers.get("x-request-id");
      if (!lastRequestId) throw new GonkaCallError("Gonka response did not include a request ID.");
      const content = result.data.choices[0]?.message.content;
      if (!content) throw new GonkaCallError("Gonka returned an empty structured response.", lastRequestId);
      let json: unknown;
      try { json = JSON.parse(content); } catch { json = null; }
      const parsed = schema.safeParse(json);
      if (parsed.success) return { data: parsed.data, requestId: lastRequestId, model: result.data.model || model, raw: json, latencyMs: Date.now() - started };
      repair = "Your previous output did not match the required JSON contract. Return only a corrected JSON object with no prose or markdown.";
    } catch (error) {
      if (error instanceof GonkaCallError && attempt === 0 && error.requestId) { repair = "Return only valid JSON matching the requested fields."; continue; }
      throw error instanceof GonkaCallError ? error : new GonkaCallError("Gonka request failed.", lastRequestId, error);
    }
  }
  throw new GonkaCallError("Gonka returned invalid structured output after one repair attempt.", lastRequestId);
}

export async function runGonkaSmokeTest(environment: NodeJS.ProcessEnv = process.env): Promise<GonkaSmokeResult> {
  const config = getGonkaConfiguration(environment);
  if (!config) return { status: "unconfigured", model: null, requestId: null };
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl });
  const result = await client.chat.completions.create({ model: config.model, messages: [{ role: "user", content: "Reply with exactly: GoalGuard ready" }], max_tokens: 12, temperature: 0 }).withResponse();
  const requestId = result.response.headers.get(config.requestIdHeader);
  return { status: requestId ? "ready" : "degraded", model: result.data.model || config.model, requestId };
}
