import { BrowserProvider, type TransactionReceipt } from "ethers";

import type { PreparedTransaction } from "@/lib/contracts";

// Future-only helper. The preview-only WalletProvider deliberately does not expose it.
export async function sendPreparedTransaction(transaction: PreparedTransaction) {
  if (!window.ethereum) throw new Error("An EIP-1193 wallet is required.");
  if (transaction.chainId !== 8453) throw new Error("GoalGuard rejected a transaction for the wrong network.");
  const provider = new BrowserProvider(window.ethereum);
  const network = await provider.getNetwork();
  if (network.chainId !== 8453n) throw new Error("Connect a Base wallet before continuing.");
  const signer = await provider.getSigner();
  const response = await signer.sendTransaction({
    to: transaction.to,
    data: transaction.data,
    value: BigInt(transaction.valueBaseUnits),
  });
  return { hash: response.hash, wait: () => response.wait() as Promise<TransactionReceipt | null> };
}
