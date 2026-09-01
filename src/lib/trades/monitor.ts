import type { TradeVerificationRecord } from "@/lib/db/repository";
import { matchesPreparedTransaction, type TransactionEvidence } from "./verification";

interface ReceiptEvidence { status: number | null; blockNumber: number; }
interface BuyerPosition { id: string; entryTxHash: string; side: string; }

export interface TradeMonitorDependencies {
  provider: {
    getTransaction(hash: string): Promise<TransactionEvidence | null>;
    getTransactionReceipt(hash: string): Promise<ReceiptEvidence | null>;
    getBlockNumber(): Promise<number>;
  };
  getPositions(walletAddress: string): Promise<BuyerPosition[]>;
  confirmTrade(id: string, protocolPositionId: string, blockNumber: string, confirmations: number): Promise<void>;
  failTrade(id: string, failureCode: string, failureMessage: string): Promise<void>;
  now?: () => number;
}

export async function verifySubmittedTrade(record: TradeVerificationRecord, dependencies: TradeMonitorDependencies) {
  const hash = record.trade.txHash;
  if (!hash) return;
  const [transaction, receipt] = await Promise.all([dependencies.provider.getTransaction(hash), dependencies.provider.getTransactionReceipt(hash)]);
  if (!transaction) return;
  const matches = matchesPreparedTransaction(transaction, { walletAddress: record.trade.walletAddress, target: record.expectedExecutionTarget, calldataHash: record.expectedCalldataHash, valueBaseUnits: record.expectedValueBaseUnits });
  if (!matches) { await dependencies.failTrade(record.trade.id, "TRANSACTION_MISMATCH", "The broadcast transaction did not match the prepared trade."); return; }
  const now = dependencies.now?.() ?? Date.now();
  if (!receipt) { if (now > Date.parse(record.verificationDeadline)) await dependencies.failTrade(record.trade.id, "RECEIPT_TIMEOUT", "The transaction was not mined before the verification deadline."); return; }
  if (receipt.status !== 1) { await dependencies.failTrade(record.trade.id, "TRANSACTION_REVERTED", "The Base transaction reverted."); return; }
  const positions = await dependencies.getPositions(record.trade.walletAddress);
  const position = positions.find((item) => item.entryTxHash.toLowerCase() === hash.toLowerCase() && item.side === "buyer");
  if (!position) { if (now > Date.parse(record.verificationDeadline)) await dependencies.failTrade(record.trade.id, "POSITION_NOT_INDEXED", "Thetanuts did not expose a matching buyer position before the verification deadline."); return; }
  const latestBlock = await dependencies.provider.getBlockNumber();
  await dependencies.confirmTrade(record.trade.id, position.id, receipt.blockNumber.toString(), Math.max(0, latestBlock - receipt.blockNumber + 1));
}
