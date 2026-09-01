import "server-only";
import { ThetanutsClient } from "@thetanuts-finance/thetanuts-client";
import { JsonRpcProvider } from "ethers";

import { getThetanutsConfiguration } from "@/lib/config/env";

export type ThetanutsSmokeResult =
  | { status: "unconfigured"; chainId: 8453; activeEthPutCount: null; marketAsOf: null }
  | { status: "ready"; chainId: 8453; activeEthPutCount: number; marketAsOf: string };

export function createReadOnlyThetanutsClient(rpcUrl: string) {
  const provider = new JsonRpcProvider(rpcUrl, 8453, { staticNetwork: true });
  return new ThetanutsClient({ chainId: 8453, provider });
}

export function createConfiguredThetanutsClient(rpcUrl: string, referrerAddress?: string | null) {
  const provider = new JsonRpcProvider(rpcUrl, 8453, { staticNetwork: true });
  return new ThetanutsClient({ chainId: 8453, provider, ...(referrerAddress ? { referrer: referrerAddress } : {}) });
}

export async function runThetanutsSmokeTest(environment: NodeJS.ProcessEnv = process.env): Promise<ThetanutsSmokeResult> {
  const config = getThetanutsConfiguration(environment);
  if (!config) {
    return { status: "unconfigured", chainId: 8453, activeEthPutCount: null, marketAsOf: null };
  }

  const client = createReadOnlyThetanutsClient(config.rpcUrl);
  const [orders, market] = await Promise.all([
    client.api.filterOrders({ asset: "ETH", type: "put", minExpiry: Math.floor(Date.now() / 1000) }),
    client.api.getMarketData(),
  ]);

  if (!Number.isFinite(market.prices.ETH) || market.prices.ETH <= 0) {
    throw new Error("Thetanuts returned invalid ETH market data.");
  }

  return {
    status: "ready",
    chainId: config.chainId,
    activeEthPutCount: orders.length,
    marketAsOf: new Date(market.metadata.lastUpdated).toISOString(),
  };
}
