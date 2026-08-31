"use client";

import { Button } from "@/components/ui/button";
import { useWallet } from "@/components/wallet/wallet-provider";
import { shortenAddress } from "@/lib/frontend/format";

export function WalletControl() {
  const wallet = useWallet();

  if (wallet.status === "connected" && wallet.address) {
    return <Button variant="secondary" aria-label={`Wallet connected: ${wallet.address}`}>{shortenAddress(wallet.address)}</Button>;
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button
        variant={wallet.status === "wrong-network" ? "primary" : "secondary"}
        onClick={wallet.status === "wrong-network" ? wallet.switchToBase : wallet.connect}
        disabled={wallet.status === "connecting"}
      >
        {wallet.status === "connecting" ? "Connecting…" : wallet.status === "wrong-network" ? "Switch to Base" : "Connect wallet"}
      </Button>
      {wallet.message ? <p className="max-w-64 text-right text-xs text-[var(--danger-soft)]" role="status">{wallet.message}</p> : null}
    </div>
  );
}
