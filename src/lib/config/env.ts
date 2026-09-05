import { z } from "zod";

const optional = <T extends z.ZodType>(schema: T) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  schema.optional(),
);

const optionalNonEmpty = optional(z.string().trim().min(1));
const optionalUrl = optional(z.string().url());

export const ServerEnvironmentSchema = z.object({
  GONKA_API_KEY: optionalNonEmpty,
  GONKA_BASE_URL: optionalUrl,
  GONKA_STRATEGIST_MODEL: optionalNonEmpty,
  GONKA_RISK_AUDITOR_MODEL: optionalNonEmpty,
  GONKA_CONSUMER_ADVOCATE_MODEL: optionalNonEmpty,
  GONKA_REQUEST_ID_HEADER: z.string().trim().min(1).default("x-request-id"),
  THETANUTS_RPC_URL: optionalUrl,
  THETANUTS_RPC_FALLBACK_URL: optionalUrl,
  THETANUTS_REFERRER_ADDRESS: optional(z.string().regex(/^0x[0-9a-fA-F]{40}$/)),
  ENABLE_LIVE_THETANUTS_EXECUTION: z.enum(["true", "false"]).default("false"),
  MAX_LIVE_TRADE_PREMIUM_USD: z.string().regex(/^(0|[1-9]\d*)(\.\d+)?$/).default("3"),
  MAX_DEADLINE_GAP_HOURS: z.coerce.number().int().positive().default(168),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: optional(z.string().startsWith("postgres")),
  DATABASE_DIRECT_URL: optional(z.string().startsWith("postgres")),
  TRADE_WORKER_NAME: z.string().trim().min(1).default("trade-monitor"),
  TRADE_WORKER_POLL_MS: z.coerce.number().int().min(1000).default(5000),
  TRADE_WORKER_HEARTBEAT_MS: z.coerce.number().int().min(1000).default(15000),
  MARKET_SNAPSHOT_MS: z.coerce.number().int().min(60_000).default(900_000),
  // One goal that any visitor may read, so a shared link or a fresh browser lands on a populated
  // workspace instead of an ownership error. Read-only: writes stay scoped to the caller's session.
  DEMO_GOAL_ID: optional(z.string().uuid()),
}).strip();

export function readServerEnvironment(environment: NodeJS.ProcessEnv = process.env) {
  return ServerEnvironmentSchema.parse(environment);
}

export function getGonkaConfiguration(environment: NodeJS.ProcessEnv = process.env) {
  const env = readServerEnvironment(environment);
  if (!env.GONKA_API_KEY || !env.GONKA_BASE_URL || !env.GONKA_STRATEGIST_MODEL) return null;
  return {
    apiKey: env.GONKA_API_KEY,
    baseUrl: env.GONKA_BASE_URL,
    model: env.GONKA_STRATEGIST_MODEL,
    requestIdHeader: env.GONKA_REQUEST_ID_HEADER,
  };
}

export function getGonkaCouncilConfiguration(environment: NodeJS.ProcessEnv = process.env) {
  const env = readServerEnvironment(environment);
  const models = {
    strategist: env.GONKA_STRATEGIST_MODEL,
    risk_auditor: env.GONKA_RISK_AUDITOR_MODEL,
    consumer_advocate: env.GONKA_CONSUMER_ADVOCATE_MODEL,
  };
  if (!env.GONKA_API_KEY || !env.GONKA_BASE_URL || Object.values(models).some((model) => !model)) return null;
  if (new Set(Object.values(models)).size < 2) return null;
  return { apiKey: env.GONKA_API_KEY, baseUrl: env.GONKA_BASE_URL, models: models as Record<keyof typeof models, string>, requestIdHeader: env.GONKA_REQUEST_ID_HEADER };
}

export function getThetanutsConfiguration(environment: NodeJS.ProcessEnv = process.env) {
  const env = readServerEnvironment(environment);
  if (!env.THETANUTS_RPC_URL || !env.THETANUTS_RPC_FALLBACK_URL) return null;
  return {
    rpcUrl: env.THETANUTS_RPC_URL,
    fallbackRpcUrl: env.THETANUTS_RPC_FALLBACK_URL,
    referrerAddress: env.THETANUTS_REFERRER_ADDRESS ?? null,
    chainId: 8453 as const,
  };
}

export function getFrontendCapabilities(environment: NodeJS.ProcessEnv = process.env) {
  const env = readServerEnvironment(environment);
  return {
    liveExecutionEnabled: env.ENABLE_LIVE_THETANUTS_EXECUTION === "true",
    chainId: 8453 as const,
    maxLiveTradePremiumUsd: env.MAX_LIVE_TRADE_PREMIUM_USD,
  };
}
