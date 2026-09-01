// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sha256 } from "@/lib/domain/hash";
import { matchesPreparedTransaction } from "./verification";

const transaction = { chainId: 8453n, from: "0x1111111111111111111111111111111111111111", to: "0x2222222222222222222222222222222222222222", data: "0xabcd", value: 0n };
const expected = { walletAddress: transaction.from, target: transaction.to, calldataHash: sha256(transaction.data), valueBaseUnits: "0" };

describe("prepared transaction verification", () => {
  it("accepts only the exact prepared Base transaction", () => { expect(matchesPreparedTransaction(transaction, expected)).toBe(true); });
  it.each([
    { chainId: 1n }, { from: "0x3333333333333333333333333333333333333333" }, { to: "0x3333333333333333333333333333333333333333" }, { data: "0xbeef" }, { value: 1n },
  ])("rejects a mismatched transaction field", (change) => { expect(matchesPreparedTransaction({ ...transaction, ...change }, expected)).toBe(false); });
});
