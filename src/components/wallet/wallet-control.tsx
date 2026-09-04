"use client";

import { CheckCircle, Plug, Wallet } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/components/wallet/wallet-provider";
import { shortenAddress } from "@/lib/frontend/format";

export function WalletControl({ compact = false, fullWidth = false }: { compact?: boolean; fullWidth?: boolean }) {
  const wallet = useWallet();

  if (wallet.status === "connected" && wallet.address) {
    return <Button variant="secondary" className={`${compact ? "px-3" : ""} ${fullWidth ? "w-full" : ""}`} aria-label={`Wallet connected: ${wallet.address}`}><CheckCircle className="text-[color:var(--positive)]" weight="fill" aria-hidden="true" /><span className={compact ? "hidden font-sans tabular-nums min-[520px]:inline" : "font-sans tabular-nums"}>{shortenAddress(wallet.address)}</span></Button>;
  }

  return (
    <div className={`flex flex-col gap-1.5 ${fullWidth ? "w-full items-stretch" : "items-end"}`}>
      <Button
        variant={wallet.status === "wrong-network" ? "primary" : "secondary"}
        onClick={wallet.status === "wrong-network" ? wallet.switchToBase : wallet.connect}
        disabled={wallet.status === "connecting"}
        className={`${compact ? "px-3" : ""} ${fullWidth ? "w-full" : ""}`}
        aria-label={wallet.status === "wrong-network" ? "Switch your wallet to Base" : compact ? "Connect wallet" : undefined}
      >
        {wallet.status === "wrong-network" ? <Plug aria-hidden="true" /> : <Wallet aria-hidden="true" />}<span className={compact ? "hidden min-[520px]:inline" : ""}>{wallet.status === "connecting" ? "Connecting…" : wallet.status === "wrong-network" ? "Switch to Base" : "Connect wallet"}</span>
      </Button>
      {wallet.message ? <p className={compact ? "sr-only" : `${fullWidth ? "max-w-none text-left" : "max-w-64 text-right"} text-xs text-[color:var(--negative)]`} role="status">{wallet.message}</p> : null}
    </div>
  );
}
