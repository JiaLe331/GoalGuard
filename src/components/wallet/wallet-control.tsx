"use client";

import { CheckCircle, Plug, Wallet } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/components/wallet/wallet-provider";
import { shortenAddress } from "@/lib/frontend/format";

export function WalletControl({ compact = false }: { compact?: boolean }) {
  const wallet = useWallet();

  if (wallet.status === "connected" && wallet.address) {
    return <Button variant="secondary" aria-label={`Wallet connected: ${wallet.address}`}><CheckCircle className="text-[var(--positive)]" weight="fill" aria-hidden="true" /><span className="font-sans tabular-nums">{shortenAddress(wallet.address)}</span></Button>;
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button
        variant={wallet.status === "wrong-network" ? "primary" : "secondary"}
        onClick={wallet.status === "wrong-network" ? wallet.switchToBase : wallet.connect}
        disabled={wallet.status === "connecting"}
      >
        {wallet.status === "wrong-network" ? <Plug aria-hidden="true" /> : <Wallet aria-hidden="true" />}{wallet.status === "connecting" ? "Connecting…" : wallet.status === "wrong-network" ? "Switch to Base" : "Connect wallet"}
      </Button>
      {wallet.message ? <p className={compact ? "sr-only" : "max-w-64 text-right text-xs text-[var(--negative)]"} role="status">{wallet.message}</p> : null}
    </div>
  );
}
