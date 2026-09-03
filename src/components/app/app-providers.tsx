"use client";

import { createContext, useContext, type ReactNode } from "react";

import { WalletProvider } from "@/components/wallet/wallet-provider";

export interface FrontendCapabilities {
  liveExecutionEnabled: boolean;
  chainId: 8453;
  maxLiveTradePremiumUsd: string;
}

const CapabilitiesContext = createContext<FrontendCapabilities | null>(null);

export function AppProviders({ capabilities, children }: { capabilities: FrontendCapabilities; children: ReactNode }) {
  return (
    <CapabilitiesContext.Provider value={capabilities}>
      <WalletProvider>{children}</WalletProvider>
    </CapabilitiesContext.Provider>
  );
}

export function useCapabilities() {
  const value = useContext(CapabilitiesContext);
  if (!value) throw new Error("useCapabilities must be used inside AppProviders.");
  return value;
}
