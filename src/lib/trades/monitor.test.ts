// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TradeVerificationRecord } from "@/lib/db/repository";
import { sha256 } from "@/lib/domain/hash";
import { fixtureTrade } from "@/test/fixtures/goalguard";
import { verifySubmittedTrade, type TradeMonitorDependencies } from "./monitor";

const hash = `0x${"a".repeat(64)}`;
const transaction = { chainId: 8453n, from: fixtureTrade.walletAddress, to: "0x2222222222222222222222222222222222222222", data: "0xabcd", value: 0n };
const record: TradeVerificationRecord = { trade: { ...fixtureTrade, status: "submitted", txHash: hash, submittedAt: "2026-09-01T00:00:00.000Z" }, expectedExecutionTarget: transaction.to, expectedCalldataHash: sha256(transaction.data), expectedValueBaseUnits: "0", verificationDeadline: "2026-09-01T00:10:00.000Z", receiptBlockNumber: null, receiptConfirmations: null };

function dependencies(): TradeMonitorDependencies {
  return { provider: { getTransaction: vi.fn(async () => transaction), getTransactionReceipt: vi.fn(async () => ({ status: 1, blockNumber: 100 })), getBlockNumber: vi.fn(async () => 102) }, getPositions: vi.fn(async () => [{ id: "position-1", entryTxHash: hash, side: "buyer" }]), confirmTrade: vi.fn(async () => undefined), failTrade: vi.fn(async () => undefined), now: () => Date.parse("2026-09-01T00:05:00.000Z") };
}

describe("trade monitor verification", () => {
  let deps: TradeMonitorDependencies;
  beforeEach(() => { deps = dependencies(); });

  it("confirms only a matching successful buyer position", async () => {
    await verifySubmittedTrade(record, deps);
    expect(deps.confirmTrade).toHaveBeenCalledWith(record.trade.id, "position-1", "100", 3);
    expect(deps.failTrade).not.toHaveBeenCalled();
  });

  it("fails a transaction that differs from the prepared calldata", async () => {
    vi.mocked(deps.provider.getTransaction).mockResolvedValue({ ...transaction, data: "0xbeef" });
    await verifySubmittedTrade(record, deps);
    expect(deps.failTrade).toHaveBeenCalledWith(record.trade.id, "TRANSACTION_MISMATCH", expect.any(String));
  });

  it("fails a reverted receipt", async () => {
    vi.mocked(deps.provider.getTransactionReceipt).mockResolvedValue({ status: 0, blockNumber: 100 });
    await verifySubmittedTrade(record, deps);
    expect(deps.failTrade).toHaveBeenCalledWith(record.trade.id, "TRANSACTION_REVERTED", expect.any(String));
  });

  it("waits for indexing before the deadline and fails after it", async () => {
    vi.mocked(deps.getPositions).mockResolvedValue([]);
    await verifySubmittedTrade(record, deps);
    expect(deps.failTrade).not.toHaveBeenCalled();
    deps.now = () => Date.parse("2026-09-01T00:11:00.000Z");
    await verifySubmittedTrade(record, deps);
    expect(deps.failTrade).toHaveBeenCalledWith(record.trade.id, "POSITION_NOT_INDEXED", expect.any(String));
  });
});
