import { JsonRpcProvider } from "ethers";

export const BASE_CHAIN_ID = 8453 as const;

export interface BaseRpcProvider {
  getNetwork(): Promise<{ chainId: bigint }>;
}

export interface RpcReadProviders<TProvider extends BaseRpcProvider = JsonRpcProvider> {
  primary: TProvider;
  fallback: TProvider;
}

export class RpcReadError extends Error {
  constructor(message: string, readonly retryable: boolean, readonly cause?: unknown) {
    super(message);
    this.name = "RpcReadError";
  }
}

export function redactRpcUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}/…`;
  } catch {
    return "[invalid RPC URL]";
  }
}

export function isRetryableRpcError(error: unknown): boolean {
  if (error instanceof RpcReadError) return error.retryable;
  const value = error as { code?: unknown; status?: unknown; response?: { status?: unknown }; message?: unknown };
  const code = typeof value?.code === "string" ? value.code.toUpperCase() : "";
  const status = typeof value?.status === "number" ? value.status : typeof value?.response?.status === "number" ? value.response.status : 0;
  const message = typeof value?.message === "string" ? value.message.toLowerCase() : "";
  return status === 408 || status === 429 || status >= 500 || ["TIMEOUT", "NETWORK_ERROR", "SERVER_ERROR", "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT"].includes(code)
    || /timeout|timed out|throttl|rate limit|connection reset|network error|temporar(?:y|ily)|econnreset|econnrefused|etimedout/.test(message);
}

async function assertBaseChain(provider: BaseRpcProvider): Promise<void> {
  let network: { chainId: bigint };
  try {
    network = await provider.getNetwork();
  } catch (error) {
    throw new RpcReadError("Base RPC network readiness check failed.", isRetryableRpcError(error), error);
  }
  if (network.chainId !== BigInt(BASE_CHAIN_ID)) {
    throw new RpcReadError("Configured RPC provider is not Base mainnet (8453).", false);
  }
}

export async function withRpcReadFallback<T, TProvider extends BaseRpcProvider>(
  providers: RpcReadProviders<TProvider>,
  operation: (provider: TProvider) => Promise<T>,
): Promise<T> {
  await assertBaseChain(providers.primary);
  await assertBaseChain(providers.fallback);
  try {
    return await operation(providers.primary);
  } catch (error) {
    if (!isRetryableRpcError(error)) throw error;
  }
  try {
    return await operation(providers.fallback);
  } catch (error) {
    throw new RpcReadError("Base RPC read failed on both configured providers.", isRetryableRpcError(error), error);
  }
}

export function createBaseRpcProviders(primaryUrl: string, fallbackUrl: string): RpcReadProviders {
  return {
    primary: new JsonRpcProvider(primaryUrl),
    fallback: new JsonRpcProvider(fallbackUrl),
  };
}
