import { randomUUID } from "node:crypto";

import {
  ApiErrorResponseSchema,
  GenerateCandidatesResponseSchema,
  IntegrationStatusResponseSchema,
  ParseGoalResponseSchema,
  PreviewTradeResponseSchema,
  ReviewCandidateResponseSchema,
  type ApiErrorResponse,
} from "../src/lib/contracts";
import { loadLocalEnvironment } from "./load-local-env";

loadLocalEnvironment();

const appUrl = new URL(process.env.GOALGUARD_SMOKE_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000");
const origin = appUrl.origin;
const walletAddress = process.env.GOALGUARD_SMOKE_WALLET_ADDRESS;
if (!walletAddress) throw new Error("GOALGUARD_SMOKE_WALLET_ADDRESS is required.");

const deadline = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const message = process.env.GOALGUARD_SMOKE_GOAL_MESSAGE ?? `Protect $100 of my ETH rent fund by ${deadline}. I can accept at most 10% loss and spend up to $10 on protection.`;
let cookie = "";

async function request(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (cookie) headers.set("Cookie", cookie);
  const response = await fetch(new URL(path, appUrl), { ...init, headers });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";", 1)[0]!;
  const json: unknown = await response.json();
  return { response, json };
}

async function post(path: string, body: unknown, idempotencyKey?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json", Origin: origin };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  return request(path, { method: "POST", headers, body: JSON.stringify(body) });
}

function upstreamError(json: unknown): ApiErrorResponse | null {
  const parsed = ApiErrorResponseSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

function requireSuccess(response: Response, json: unknown, step: string) {
  if (response.ok) return;
  const error = upstreamError(json);
  throw new Error(`${step} failed: ${error ? `${error.error.code}: ${error.error.message}` : `HTTP ${response.status}`}`);
}

const statusResult = await request("/api/integrations/status");
requireSuccess(statusResult.response, statusResult.json, "Integration readiness");
const integrations = IntegrationStatusResponseSchema.parse(statusResult.json);
if (integrations.data.database.status !== "ready" || integrations.data.gonka.status !== "ready" || integrations.data.thetanuts.status !== "ready") throw new Error(`Integrations are not ready: ${JSON.stringify(integrations.data)}`);

const parseResult = await post("/api/goals/parse", { message, locale: "en", timezone: "UTC" });
requireSuccess(parseResult.response, parseResult.json, "Goal parsing");
const parsed = ParseGoalResponseSchema.parse(parseResult.json);
if (!parsed.data.goal) throw new Error(`The smoke goal was incomplete: ${parsed.data.clarificationQuestion ?? parsed.data.missingFields.join(", ")}`);

const candidateResult = await post("/api/protection/candidates", { goalId: parsed.data.goal.id, refresh: true });
requireSuccess(candidateResult.response, candidateResult.json, "Candidate generation");
const candidates = GenerateCandidatesResponseSchema.parse(candidateResult.json);
const candidate = candidates.data.candidates[0];
if (!candidate) throw new Error("Candidate generation returned no selected candidate.");

const reviewResult = await post("/api/council/review", { goalId: parsed.data.goal.id, candidateId: candidate.id });
requireSuccess(reviewResult.response, reviewResult.json, "Council review");
const review = ReviewCandidateResponseSchema.parse(reviewResult.json);
if (review.data.decision.status !== "approved") throw new Error(`Council result was ${review.data.decision.status}; execution remains blocked.`);

const previewResult = await post("/api/trades/preview", { goalId: parsed.data.goal.id, candidateId: candidate.id, councilDecisionId: review.data.decision.id, walletAddress }, randomUUID());
requireSuccess(previewResult.response, previewResult.json, "Trade preview");
const preview = PreviewTradeResponseSchema.parse(previewResult.json);

const disabledResult = await post("/api/trades/execute", { tradeId: preview.data.trade.id, quoteFingerprint: preview.data.trade.quoteFingerprint, walletAddress, chainId: 8453, userConfirmed: true }, randomUUID());
const disabledError = upstreamError(disabledResult.json);
if (disabledResult.response.status !== 422 || disabledError?.error.code !== "EXECUTION_DISABLED") throw new Error("Live execution was not safely blocked by EXECUTION_DISABLED.");

console.log(JSON.stringify({
  integrations: integrations.data,
  goalId: parsed.data.goal.id,
  parseRequestId: parsed.data.inference.requestId,
  marketAsOf: candidates.data.marketAsOf,
  protocolOrderId: candidate.protocolOrderId,
  councilRequestIds: review.data.decision.reviews.map(({ role, model, requestId }) => ({ role, model, requestId })),
  councilDecisionId: review.data.decision.id,
  previewTradeId: preview.data.trade.id,
  previewExpiresAt: preview.data.trade.previewExpiresAt,
  executionGate: disabledError.error.code,
}, null, 2));
