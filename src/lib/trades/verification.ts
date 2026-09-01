import { sha256 } from "@/lib/domain/hash";

export interface TransactionEvidence {
  chainId: bigint;
  from: string;
  to: string | null;
  data: string;
  value: bigint;
}

export interface ExpectedTransaction {
  walletAddress: string;
  target: string;
  calldataHash: string;
  valueBaseUnits: string;
}

export function matchesPreparedTransaction(transaction: TransactionEvidence, expected: ExpectedTransaction) {
  return transaction.chainId === 8453n
    && transaction.from.toLowerCase() === expected.walletAddress.toLowerCase()
    && transaction.to?.toLowerCase() === expected.target.toLowerCase()
    && sha256(transaction.data.toLowerCase()) === expected.calldataHash
    && transaction.value.toString() === expected.valueBaseUnits;
}
