import "server-only";
import OpenAI from "openai";
import type { ZodType } from "zod";
import { getGonkaConfiguration } from "@/lib/config/env";

export type GonkaSmokeResult = { status: "unconfigured"; model: null; requestId: null } | { status: "ready" | "degraded"; model: string; requestId: string | null };
export class GonkaCallError extends Error { constructor(message: string, readonly requestId: string | null = null, readonly causeValue?: unknown) { super(message); } }
export interface GonkaJsonResult<T> { data: T; requestId: string; model: string; raw: unknown; latencyMs: number; }

/**
 * Some Gonka-hosted reasoning models (e.g. MiniMax-M2.7) always prepend a visible
 * <think>...</think> block before the actual JSON answer, even under response_format:
 * json_object -- so the raw content is not valid JSON on its own. Strip any such block, and
 * fall back to the outermost {...} span, before attempting to parse. A no-op for content that
 * is already plain JSON.
 */
function extractJsonContent(content: string): unknown {
  const withoutThinking = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  try { return JSON.parse(withoutThinking); } catch { /* fall through */ }
  const start = withoutThinking.indexOf("{"); const end = withoutThinking.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(withoutThinking.slice(start, end + 1)); } catch { return null; }
}

export async function callGonkaJson<T>({ apiKey, baseUrl, model, requestIdHeader, system, input, schema }: { apiKey: string; baseUrl: string; model: string; requestIdHeader: string; system: string; input: unknown; schema: ZodType<T>; }): Promise<GonkaJsonResult<T>> {
  // Council reviews send a much larger prompt (full candidate JSON) than the single-field goal
  // parse this timeout also covers. Observed live latencies for this prompt size have ranged from
  // ~20s to 120s+ per attempt independent of concurrency (i.e. this is Gonka-side generation time
  // for a larger prompt, not contention) -- sized generously so a genuinely slow-but-successful
  // response is not cut off.
  const client = new OpenAI({ apiKey, baseURL: baseUrl, timeout: 120_000, maxRetries: 1 });
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
      const json = extractJsonContent(content);
      const parsed = schema.safeParse(json);
      if (process.env.GOALGUARD_DEBUG_GONKA) console.error("[gonka-debug]", { attempt, model, contentLength: content.length, contentPreview: content.slice(0, 80), extracted: json, parseSuccess: parsed.success, parseErrors: parsed.success ? null : parsed.error.issues });
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
