import "server-only";
import OpenAI from "openai";
import type { ZodType } from "zod";
import { getActiveAiConfiguration, getGonkaConfiguration } from "@/lib/config/env";

export type AiProvider = "deepseek" | "gonka";
export type AiSmokeResult = { provider: AiProvider; status: "unconfigured"; model: null; requestId: null } | { provider: AiProvider; status: "ready" | "degraded"; model: string; requestId: string | null };
export class AiCallError extends Error { constructor(message: string, readonly requestId: string | null = null, readonly causeValue?: unknown) { super(message); } }
export interface AiJsonResult<T> { data: T; requestId: string; model: string; raw: unknown; latencyMs: number; }
export type GonkaSmokeResult = Omit<AiSmokeResult, "provider">;
export { AiCallError as GonkaCallError };
export type GonkaJsonResult<T> = AiJsonResult<T>;

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

export async function callAiJson<T>({ provider, apiKey, baseUrl, model, requestIdHeader, system, input, schema }: { provider?: AiProvider; apiKey: string; baseUrl: string; model: string; requestIdHeader: string; system: string; input: unknown; schema: ZodType<T>; }): Promise<AiJsonResult<T>> {
  // Council reviews send a much larger prompt (full candidate JSON) than the single-field goal
  // parse this timeout also covers. Observed live latencies for this prompt size have ranged from
  // ~20s to 120s+ per attempt independent of concurrency (i.e. this is Gonka-side generation time
  // for a larger prompt, not contention) -- sized generously so a genuinely slow-but-successful
  // response is not cut off.
  const isDeepSeek = provider === "deepseek";
  const client = new OpenAI({ apiKey, baseURL: baseUrl, timeout: isDeepSeek ? 60_000 : 120_000, maxRetries: isDeepSeek ? 0 : 1 });
  const started = Date.now();
  let repair: string | null = null;
  let lastRequestId: string | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await client.chat.completions.create({ model, messages: [
        { role: "system", content: system }, { role: "user", content: JSON.stringify(input) },
        ...(repair ? [{ role: "user" as const, content: repair }] : []),
      ], response_format: { type: "json_object" }, temperature: 0,
      ...(isDeepSeek ? { reasoning_effort: "none" as const, max_completion_tokens: 1600 } : {}),
      }).withResponse();
      lastRequestId = result.response.headers.get(requestIdHeader) ?? result.response.headers.get("x-request-id") ?? (provider === "deepseek" ? result.data.id : null);
      if (!lastRequestId) throw new AiCallError("AI provider response did not include a request ID.");
      const content = result.data.choices[0]?.message.content;
      if (!content) throw new AiCallError("AI provider returned an empty structured response.", lastRequestId);
      const json = extractJsonContent(content);
      const parsed = schema.safeParse(json);
      if (process.env.GOALGUARD_DEBUG_AI) console.error("[ai-debug]", { attempt, model, contentLength: content.length, contentPreview: content.slice(0, 80), extracted: json, parseSuccess: parsed.success, parseErrors: parsed.success ? null : parsed.error.issues });
      if (parsed.success) return { data: parsed.data, requestId: lastRequestId, model: result.data.model || model, raw: json, latencyMs: Date.now() - started };
      repair = `Your previous output did not match the required JSON contract: ${parsed.error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`).join("; ")}. Return only a corrected JSON object with no prose or markdown.`;
    } catch (error) {
      if (error instanceof AiCallError && attempt === 0 && error.requestId) { repair = "Return only valid JSON matching the requested fields."; continue; }
      throw error instanceof AiCallError ? error : new AiCallError("AI provider request failed.", lastRequestId, error);
    }
  }
  throw new AiCallError("AI provider returned invalid structured output after one repair attempt.", lastRequestId);
}

// Retained for the Gonka integration and its smoke script. Active application flows use callAiJson.
export const callGonkaJson = callAiJson;

export async function runAiSmokeTest(environment: NodeJS.ProcessEnv = process.env): Promise<AiSmokeResult> {
  const provider = environment.AI_PROVIDER === "gonka" ? "gonka" : "deepseek";
  const config = getActiveAiConfiguration(environment);
  if (!config) return { provider, status: "unconfigured", model: null, requestId: null };
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl });
  const result = await client.chat.completions.create({ model: config.model, messages: [{ role: "user", content: "Reply with exactly: GoalGuard ready" }], max_tokens: 12, temperature: 0 }).withResponse();
  const requestId = result.response.headers.get(config.requestIdHeader) ?? result.response.headers.get("x-request-id") ?? (config.provider === "deepseek" ? result.data.id : null);
  return { provider: config.provider, status: requestId ? "ready" : "degraded", model: result.data.model || config.model, requestId };
}

export async function runGonkaSmokeTest(environment: NodeJS.ProcessEnv = process.env): Promise<GonkaSmokeResult> {
  const config = getGonkaConfiguration(environment);
  if (!config) return { status: "unconfigured", model: null, requestId: null };
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl });
  const result = await client.chat.completions.create({ model: config.model, messages: [{ role: "user", content: "Reply with exactly: GoalGuard ready" }], max_tokens: 12, temperature: 0 }).withResponse();
  const requestId = result.response.headers.get(config.requestIdHeader);
  return { status: requestId ? "ready" : "degraded", model: result.data.model || config.model, requestId };
}
