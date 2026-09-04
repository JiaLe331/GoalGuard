import { ThetanutsClient, type OrderWithSignature } from "@thetanuts-finance/thetanuts-client";
import { JsonRpcProvider, type Provider } from "ethers";
import { z } from "zod";

import { getThetanutsConfiguration } from "@/lib/config/env";
import { BASE_CHAIN_ID, createBaseRpcProviders, withRpcReadFallback } from "./rpc";

export type ThetanutsOrder = OrderWithSignature;
export interface ThetanutsReadClient {
  chainConfig: ThetanutsClient["chainConfig"];
  api: Pick<ThetanutsClient["api"], "fetchOrders" | "getMarketData" | "getUserPositionsFromIndexer">;
  erc20: Pick<ThetanutsClient["erc20"], "getAllowance" | "getBalance" | "encodeApprove">;
  optionBook: Pick<ThetanutsClient["optionBook"], "previewFillOrder" | "encodeFillOrder">;
}

const marketDataSchema = z.object({
  prices: z.object({ ETH: z.number().finite().positive() }).passthrough(),
  metadata: z.object({ lastUpdated: z.number().finite().nonnegative() }).passthrough(),
}).passthrough();

export function parseThetanutsMarketData(value: unknown) {
  return marketDataSchema.parse(value);
}

export interface KnownToken { symbol: string; decimals: number }

/**
 * Resolve a collateral token's symbol/decimals from the SDK's own chain
 * configuration (which lists every token the protocol currently recognizes,
 * e.g. USDC and aBasUSDC). Returns null for an address the SDK does not
 * recognize -- callers must reject rather than guess, since decimals drive
 * every downstream dollar calculation for that order.
 */
export function resolveKnownToken(chainConfig: ThetanutsReadClient["chainConfig"], tokenAddress: string): KnownToken | null {
  const lowerAddress = tokenAddress.toLowerCase();
  for (const token of Object.values(chainConfig.tokens)) {
    if (token.address.toLowerCase() === lowerAddress) return { symbol: token.symbol, decimals: token.decimals };
  }
  return null;
}

export function parseThetanutsOrders(value: unknown): ThetanutsOrder[] {
  const result = z.array(z.object({
    order: z.object({ nonce: z.bigint() }).passthrough(),
    signature: z.string().min(1),
    availableAmount: z.bigint().nonnegative(),
    makerAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  }).passthrough()).safeParse(value);
  if (!result.success) throw new Error("Thetanuts returned malformed order data.");
  return result.data as unknown as ThetanutsOrder[];
}

/**
 * SDK 0.3.0's filtered endpoint parser expects a legacy top-level `orders`
 * property. The live Odette endpoint returns `data.orders`; `fetchOrders()`
 * already handles and normalizes that current response, so filtering happens
 * only after validation at this boundary.
 */
export async function fetchEthPutOrders(client: Pick<ThetanutsReadClient, "api" | "chainConfig">, minExpiry: number): Promise<ThetanutsOrder[]> {
  const configuredEthPriceFeed = client.chainConfig.priceFeeds.ETH;
  if (!configuredEthPriceFeed) throw new Error("Thetanuts Base configuration is missing the ETH price feed.");
  const ethPriceFeed = configuredEthPriceFeed.toLowerCase();
  return parseThetanutsOrders(await client.api.fetchOrders()).filter((order) => (
    order.rawApiData?.priceFeed.toLowerCase() === ethPriceFeed
    && order.rawApiData.isCall === false
    && order.order.expiry >= BigInt(minExpiry)
  ));
}

export type ThetanutsSmokeResult =
  | { status: "unconfigured"; chainId: 8453; activeEthPutCount: null; marketAsOf: null }
  | { status: "ready"; chainId: 8453; activeEthPutCount: number; marketAsOf: string };

export function createReadOnlyThetanutsClient(provider: Provider) {
  return new ThetanutsClient({ chainId: BASE_CHAIN_ID, provider });
}

export function createConfiguredThetanutsClient(rpcUrl: string, referrerAddress?: string | null) {
  const provider = new JsonRpcProvider(rpcUrl);
  return new ThetanutsClient({ chainId: BASE_CHAIN_ID, provider, ...(referrerAddress ? { referrer: referrerAddress } : {}) });
}

export async function withConfiguredThetanutsRead<T>(
  operation: (client: ThetanutsReadClient) => Promise<T>,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<T> {
  const config = getThetanutsConfiguration(environment);
  if (!config) throw new Error("Thetanuts requires both primary and fallback Base RPC URLs.");
  const providers = createBaseRpcProviders(config.rpcUrl, config.fallbackRpcUrl);
  return withRpcReadFallback(providers, (provider) => operation(
    new ThetanutsClient({ chainId: BASE_CHAIN_ID, provider, ...(config.referrerAddress ? { referrer: config.referrerAddress } : {}) }) as ThetanutsReadClient,
  ));
}

export async function runThetanutsSmokeTest(environment: NodeJS.ProcessEnv = process.env): Promise<ThetanutsSmokeResult> {
  const config = getThetanutsConfiguration(environment);
  if (!config) return { status: "unconfigured", chainId: 8453, activeEthPutCount: null, marketAsOf: null };

  const { orders, market } = await withConfiguredThetanutsRead(async (client) => ({
    orders: await fetchEthPutOrders(client, Math.floor(Date.now() / 1000)),
    market: parseThetanutsMarketData(await client.api.getMarketData()),
  }), environment);

  return { status: "ready", chainId: config.chainId, activeEthPutCount: orders.length, marketAsOf: new Date(market.metadata.lastUpdated).toISOString() };
}
