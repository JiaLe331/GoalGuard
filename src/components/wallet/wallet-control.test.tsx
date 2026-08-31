import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WalletControl } from "./wallet-control";
import { WalletProvider } from "./wallet-provider";

afterEach(() => {
  delete window.ethereum;
});

function walletProvider(initialChain = "0x2105") {
  let chainId = initialChain;
  const address = "0x1111111111111111111111111111111111111111";
  const request = vi.fn(async ({ method }: { method: string }) => {
    if (method === "eth_requestAccounts" || method === "eth_accounts") return [address];
    if (method === "eth_chainId") return chainId;
    if (method === "wallet_switchEthereumChain") { chainId = "0x2105"; return null; }
    return null;
  });
  return { request, on: vi.fn(), removeListener: vi.fn() };
}

function renderWallet() {
  return render(<WalletProvider><WalletControl /></WalletProvider>);
}

describe("WalletControl", () => {
  it("explains when an injected wallet is unavailable", async () => {
    const user = userEvent.setup();
    renderWallet();
    await user.click(screen.getByRole("button", { name: /connect wallet/i }));
    expect(screen.getByRole("status")).toHaveTextContent("Install an EIP-1193 wallet");
  });

  it("connects only after an explicit click", async () => {
    const provider = walletProvider();
    window.ethereum = provider;
    const user = userEvent.setup();
    renderWallet();
    expect(provider.request).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /connect wallet/i }));
    await waitFor(() => expect(screen.getByLabelText(/wallet connected/i)).toHaveTextContent("0x1111…1111"));
    expect(provider.request).toHaveBeenCalledWith(expect.objectContaining({ method: "eth_requestAccounts" }));
  });

  it("offers a Base network switch", async () => {
    const provider = walletProvider("0x1");
    window.ethereum = provider;
    const user = userEvent.setup();
    renderWallet();
    await user.click(screen.getByRole("button", { name: /connect wallet/i }));
    const switchButton = await screen.findByRole("button", { name: /switch to base/i });
    await user.click(switchButton);
    await waitFor(() => expect(screen.getByLabelText(/wallet connected/i)).toBeInTheDocument());
    expect(provider.request).toHaveBeenCalledWith(expect.objectContaining({ method: "wallet_switchEthereumChain" }));
  });
});
