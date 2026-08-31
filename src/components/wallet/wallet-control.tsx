"use client";

import { BrowserProvider } from "ethers";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const BASE_CHAIN_ID = 8453n;

type WalletState =
  | { status: "idle" | "connecting"; address: null; message: null }
  | { status: "connected"; address: string; message: null }
  | { status: "wrong-network" | "unavailable" | "error"; address: string | null; message: string };

const initialState: WalletState = { status: "idle", address: null, message: null };

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletControl() {
  const [state, setState] = useState<WalletState>(initialState);

  const readConnectedState = useCallback(async () => {
    if (!window.ethereum) return;
    const provider = new BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_accounts", []) as string[];
    if (accounts.length === 0) {
      setState(initialState);
      return;
    }
    const network = await provider.getNetwork();
    if (network.chainId !== BASE_CHAIN_ID) {
      setState({ status: "wrong-network", address: accounts[0] ?? null, message: "Switch to Base to continue." });
      return;
    }
    setState({ status: "connected", address: accounts[0]!, message: null });
  }, []);

  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum?.on) return;
    const handleChange = () => { void readConnectedState(); };
    ethereum.on("accountsChanged", handleChange);
    ethereum.on("chainChanged", handleChange);
    return () => {
      ethereum.removeListener?.("accountsChanged", handleChange);
      ethereum.removeListener?.("chainChanged", handleChange);
    };
  }, [readConnectedState]);

  async function connect() {
    if (!window.ethereum) {
      setState({ status: "unavailable", address: null, message: "Install an EIP-1193 wallet to connect." });
      return;
    }
    setState({ status: "connecting", address: null, message: null });
    try {
      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      await readConnectedState();
    } catch (reason) {
      setState({ status: "error", address: null, message: reason instanceof Error ? reason.message : "Wallet connection was rejected." });
    }
  }

  async function switchToBase() {
    if (!window.ethereum) return;
    try {
      const provider = new BrowserProvider(window.ethereum);
      await provider.send("wallet_switchEthereumChain", [{ chainId: "0x2105" }]);
      await readConnectedState();
    } catch (reason) {
      setState({ status: "error", address: state.address, message: reason instanceof Error ? reason.message : "Could not switch to Base." });
    }
  }

  if (state.status === "connected") {
    return <Button variant="secondary" aria-label={`Wallet connected: ${state.address}`}>{shortAddress(state.address)}</Button>;
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button
        variant={state.status === "wrong-network" ? "primary" : "secondary"}
        onClick={state.status === "wrong-network" ? switchToBase : connect}
        disabled={state.status === "connecting"}
      >
        {state.status === "connecting" ? "Connecting…" : state.status === "wrong-network" ? "Switch to Base" : "Connect wallet"}
      </Button>
      {state.message ? <p className="max-w-64 text-right text-xs text-[#ffaaa4]" role="status">{state.message}</p> : null}
    </div>
  );
}
