"use client";

import { BrowserProvider } from "ethers";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { isPresentationFlow } from "@/lib/frontend/presentation/flag";
import { PRESENTATION_WALLET } from "@/lib/frontend/presentation/preview";

const BASE_CHAIN_ID = 8453n;

export type WalletStatus = "idle" | "connecting" | "connected" | "wrong-network" | "unavailable" | "error";

interface WalletState {
  status: WalletStatus;
  address: string | null;
  chainId: number | null;
  message: string | null;
}

interface WalletContextValue extends WalletState {
  connect: () => Promise<void>;
  switchToBase: () => Promise<void>;
}

const initialState: WalletState = { status: "idle", address: null, chainId: null, message: null };
const WalletContext = createContext<WalletContextValue | null>(null);

function walletMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 4001) {
    return "The wallet request was rejected. Nothing was submitted.";
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>(initialState);
  const [permissionRequested, setPermissionRequested] = useState(false);

  const readConnectedState = useCallback(async () => {
    if (isPresentationFlow()) return;
    if (!window.ethereum || !permissionRequested) return;
    const provider = new BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_accounts", []) as string[];
    if (!accounts[0]) {
      setState(initialState);
      return;
    }
    const network = await provider.getNetwork();
    if (network.chainId !== BASE_CHAIN_ID) {
      setState({ status: "wrong-network", address: accounts[0], chainId: Number(network.chainId), message: "Switch to Base to continue." });
      return;
    }
    setState({ status: "connected", address: accounts[0], chainId: Number(network.chainId), message: null });
  }, [permissionRequested]);

  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum?.on || !permissionRequested) return;
    const handleChange = () => { void readConnectedState(); };
    ethereum.on("accountsChanged", handleChange);
    ethereum.on("chainChanged", handleChange);
    return () => {
      ethereum.removeListener?.("accountsChanged", handleChange);
      ethereum.removeListener?.("chainChanged", handleChange);
    };
  }, [permissionRequested, readConnectedState]);

  const connect = useCallback(async () => {
    // The presentation flow resolves the connect click itself, so a live demo does not depend
    // on a browser extension being installed, unlocked and already on Base. The button, the
    // connecting state and every downstream network guard behave exactly as they do normally.
    if (isPresentationFlow()) {
      setState({ status: "connecting", address: null, chainId: null, message: null });
      await new Promise((resolve) => setTimeout(resolve, 400));
      setState({ status: "connected", address: PRESENTATION_WALLET, chainId: 8453, message: null });
      return;
    }
    if (!window.ethereum) {
      setState({ status: "unavailable", address: null, chainId: null, message: "Install an EIP-1193 wallet to connect." });
      return;
    }
    setPermissionRequested(true);
    setState({ status: "connecting", address: null, chainId: null, message: null });
    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []) as string[];
      const network = await provider.getNetwork();
      if (!accounts[0]) throw new Error("The wallet returned no account.");
      if (network.chainId !== BASE_CHAIN_ID) {
        setState({ status: "wrong-network", address: accounts[0], chainId: Number(network.chainId), message: "Switch to Base to continue." });
        return;
      }
      setState({ status: "connected", address: accounts[0], chainId: 8453, message: null });
    } catch (error) {
      setState({ status: "error", address: null, chainId: null, message: walletMessage(error, "Wallet connection failed.") });
    }
  }, []);

  const switchToBase = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      const provider = new BrowserProvider(window.ethereum);
      await provider.send("wallet_switchEthereumChain", [{ chainId: "0x2105" }]);
      const accounts = await provider.send("eth_accounts", []) as string[];
      setState({ status: "connected", address: accounts[0] ?? state.address, chainId: 8453, message: null });
    } catch (error) {
      setState((current) => ({ ...current, status: "error", message: walletMessage(error, "Could not switch to Base.") }));
    }
  }, [state.address]);

  const value = useMemo(() => ({ ...state, connect, switchToBase }), [connect, state, switchToBase]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet must be used inside WalletProvider.");
  return value;
}
