import { z } from "zod";

const optionalNonEmpty = z.string().trim().min(1).optional();

export const ServerEnvironmentSchema = z.object({
  GONKA_API_KEY: optionalNonEmpty,
  GONKA_BASE_URL: z.string().url().optional(),
  GONKA_STRATEGIST_MODEL: optionalNonEmpty,
  GONKA_RISK_AUDITOR_MODEL: optionalNonEmpty,
  GONKA_CONSUMER_ADVOCATE_MODEL: optionalNonEmpty,
  GONKA_REQUEST_ID_HEADER: z.string().trim().min(1).default("x-request-id"),
  THETANUTS_RPC_URL: z.string().url().optional(),
  ENABLE_LIVE_THETANUTS_EXECUTION: z.enum(["true", "false"]).default("false"),
  MAX_LIVE_TRADE_PREMIUM_USD: z.string().regex(/^(0|[1-9]\d*)(\.\d+)?$/).default("3"),
  DATABASE_URL: z.string().default("file:./data/goalguard.db"),
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

export function getThetanutsConfiguration(environment: NodeJS.ProcessEnv = process.env) {
  const env = readServerEnvironment(environment);
  return env.THETANUTS_RPC_URL ? { rpcUrl: env.THETANUTS_RPC_URL, chainId: 8453 as const } : null;
}

export function getFrontendCapabilities(environment: NodeJS.ProcessEnv = process.env) {
  const env = readServerEnvironment(environment);
  return {
    liveExecutionEnabled: env.ENABLE_LIVE_THETANUTS_EXECUTION === "true",
    chainId: 8453 as const,
    maxLiveTradePremiumUsd: env.MAX_LIVE_TRADE_PREMIUM_USD,
  };
}
