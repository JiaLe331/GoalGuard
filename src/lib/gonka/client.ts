import OpenAI from "openai";

import { getGonkaConfiguration } from "@/lib/config/env";

export type GonkaSmokeResult =
  | { status: "unconfigured"; model: null; requestId: null }
  | { status: "ready" | "degraded"; model: string; requestId: string | null };

export async function runGonkaSmokeTest(environment: NodeJS.ProcessEnv = process.env): Promise<GonkaSmokeResult> {
  const config = getGonkaConfiguration(environment);
  if (!config) return { status: "unconfigured", model: null, requestId: null };

  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl });
  const result = await client.chat.completions.create({
    model: config.model,
    messages: [{ role: "user", content: "Reply with exactly: GoalGuard ready" }],
    max_tokens: 12,
    temperature: 0,
  }).withResponse();

  const requestId = result.response.headers.get(config.requestIdHeader);
  return {
    status: requestId ? "ready" : "degraded",
    model: result.data.model || config.model,
    requestId,
  };
}
