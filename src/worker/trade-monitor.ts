import { randomUUID } from "node:crypto";
import { JsonRpcProvider } from "ethers";

import { loadLocalEnvironment } from "../../scripts/load-local-env";
import { readServerEnvironment } from "@/lib/config/env";
import { PostgresGoalGuardRepository } from "@/lib/db/repository";
import { createConfiguredThetanutsClient } from "@/lib/thetanuts/client-core";
import { verifySubmittedTrade } from "@/lib/trades/monitor";
import { captureMarketSnapshot } from "./market-snapshot";

loadLocalEnvironment();

const env = readServerEnvironment();
if (!env.THETANUTS_RPC_URL) throw new Error("THETANUTS_RPC_URL is required by the trade monitor.");
const repository = new PostgresGoalGuardRepository();
const provider = new JsonRpcProvider(env.THETANUTS_RPC_URL, 8453, { staticNetwork: true });
const thetanuts = createConfiguredThetanutsClient(env.THETANUTS_RPC_URL, env.THETANUTS_REFERRER_ADDRESS);
const instanceId = randomUUID();
let stopping = false;

async function poll() {
  const submitted = await repository.listSubmittedTrades();
  for (const record of submitted) {
    if (stopping) return;
    try {
      await verifySubmittedTrade(record, {
        provider,
        getPositions: (walletAddress) => thetanuts.api.getUserPositionsFromIndexer(walletAddress),
        confirmTrade: (id, positionId, blockNumber, confirmations) => repository.confirmTrade(id, positionId, blockNumber, confirmations),
        failTrade: (id, code, message) => repository.failSubmittedTrade(id, code, message),
      });
    } catch (error) { console.error(`Trade monitor could not verify ${record.trade.id}`, error); }
  }
}

async function snapshotMarket() {
  try {
    await repository.saveMarketSnapshot(await captureMarketSnapshot(thetanuts, new Date()));
  } catch (error) {
    console.error("Market snapshot failed", error);
  }
}

async function run() {
  let nextHeartbeat = 0;
  let nextMarketSnapshot = 0;
  while (!stopping) {
    const now = Date.now();
    if (now >= nextHeartbeat) { await repository.heartbeat(env.TRADE_WORKER_NAME, instanceId); nextHeartbeat = now + env.TRADE_WORKER_HEARTBEAT_MS; }
    await poll();
    if (now >= nextMarketSnapshot) { nextMarketSnapshot = now + env.MARKET_SNAPSHOT_MS; await snapshotMarket(); }
    await new Promise<void>((resolve) => setTimeout(resolve, env.TRADE_WORKER_POLL_MS));
  }
}

for (const signal of ["SIGTERM", "SIGINT"] as const) process.on(signal, () => { stopping = true; });
run().catch((error) => { console.error("Trade monitor stopped unexpectedly", error); process.exitCode = 1; });
