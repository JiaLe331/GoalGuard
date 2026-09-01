import { randomUUID } from "node:crypto";
import { JsonRpcProvider } from "ethers";

import { readServerEnvironment } from "@/lib/config/env";
import { PostgresGoalGuardRepository, type TradeVerificationRecord } from "@/lib/db/repository";
import { createConfiguredThetanutsClient } from "@/lib/thetanuts/client";
import { matchesPreparedTransaction } from "@/lib/trades/verification";

const env = readServerEnvironment();
if (!env.THETANUTS_RPC_URL) throw new Error("THETANUTS_RPC_URL is required by the trade monitor.");
const repository = new PostgresGoalGuardRepository();
const provider = new JsonRpcProvider(env.THETANUTS_RPC_URL, 8453, { staticNetwork: true });
const thetanuts = createConfiguredThetanutsClient(env.THETANUTS_RPC_URL, env.THETANUTS_REFERRER_ADDRESS);
const instanceId = randomUUID();
let stopping = false;

async function verify(record: TradeVerificationRecord) {
  const hash = record.trade.txHash; if (!hash) return;
  const [transaction, receipt] = await Promise.all([provider.getTransaction(hash), provider.getTransactionReceipt(hash)]);
  if (!transaction) return;
  const matches = matchesPreparedTransaction(transaction, { walletAddress: record.trade.walletAddress, target: record.expectedExecutionTarget, calldataHash: record.expectedCalldataHash, valueBaseUnits: record.expectedValueBaseUnits });
  if (!matches) { await repository.failSubmittedTrade(record.trade.id, "TRANSACTION_MISMATCH", "The broadcast transaction did not match the prepared trade."); return; }
  if (!receipt) { if (Date.now() > Date.parse(record.verificationDeadline)) await repository.failSubmittedTrade(record.trade.id, "RECEIPT_TIMEOUT", "The transaction was not mined before the verification deadline."); return; }
  if (receipt.status !== 1) { await repository.failSubmittedTrade(record.trade.id, "TRANSACTION_REVERTED", "The Base transaction reverted."); return; }
  const positions = await thetanuts.api.getUserPositionsFromIndexer(record.trade.walletAddress);
  const position = positions.find((item) => item.entryTxHash.toLowerCase() === hash.toLowerCase() && item.side === "buyer");
  if (!position) { if (Date.now() > Date.parse(record.verificationDeadline)) await repository.failSubmittedTrade(record.trade.id, "POSITION_NOT_INDEXED", "Thetanuts did not expose a matching buyer position before the verification deadline."); return; }
  const latestBlock = await provider.getBlockNumber(); const confirmations = Math.max(0, latestBlock - receipt.blockNumber + 1);
  await repository.confirmTrade(record.trade.id, position.id, receipt.blockNumber.toString(), confirmations);
}

async function poll() {
  const submitted = await repository.listSubmittedTrades();
  for (const record of submitted) {
    if (stopping) return;
    try { await verify(record); } catch (error) { console.error(`Trade monitor could not verify ${record.trade.id}`, error); }
  }
}

async function run() {
  let nextHeartbeat = 0;
  while (!stopping) {
    const now = Date.now();
    if (now >= nextHeartbeat) { await repository.heartbeat(env.TRADE_WORKER_NAME, instanceId); nextHeartbeat = now + env.TRADE_WORKER_HEARTBEAT_MS; }
    await poll();
    await new Promise<void>((resolve) => setTimeout(resolve, env.TRADE_WORKER_POLL_MS));
  }
}

for (const signal of ["SIGTERM", "SIGINT"] as const) process.on(signal, () => { stopping = true; });
run().catch((error) => { console.error("Trade monitor stopped unexpectedly", error); process.exitCode = 1; });
