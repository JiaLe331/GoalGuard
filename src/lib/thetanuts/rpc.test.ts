import { describe, expect, it, vi } from "vitest";

import { BASE_CHAIN_ID, redactRpcUrl, withRpcReadFallback } from "./rpc";

const provider = (chainId = BigInt(BASE_CHAIN_ID)) => ({ getNetwork: vi.fn().mockResolvedValue({ chainId }) });

describe("Base RPC read fallback", () => {
  it("uses the primary provider when it is ready", async () => {
    const primary = provider(); const fallback = provider(); const operation = vi.fn().mockResolvedValue("live-data");
    await expect(withRpcReadFallback({ primary, fallback }, operation)).resolves.toBe("live-data");
    expect(operation).toHaveBeenCalledTimes(1); expect(operation).toHaveBeenCalledWith(primary); expect(fallback.getNetwork).toHaveBeenCalledOnce();
  });

  it("uses the fallback only for retryable read errors", async () => {
    const primary = provider(); const fallback = provider(); const operation = vi.fn().mockRejectedValueOnce({ code: "NETWORK_ERROR" }).mockResolvedValueOnce("fallback-data");
    await expect(withRpcReadFallback({ primary, fallback }, operation)).resolves.toBe("fallback-data");
    expect(operation.mock.calls.map(([value]) => value)).toEqual([primary, fallback]);
  });

  it("does not fall back after a deterministic error", async () => {
    const primary = provider(); const fallback = provider(); const operation = vi.fn().mockRejectedValue(new Error("malformed SDK response"));
    await expect(withRpcReadFallback({ primary, fallback }, operation)).rejects.toThrow("malformed SDK response");
    expect(fallback.getNetwork).toHaveBeenCalledOnce();
  });

  it("fails closed when a provider reports the wrong chain", async () => {
    const primary = provider(1n); const fallback = provider(); const operation = vi.fn();
    await expect(withRpcReadFallback({ primary, fallback }, operation)).rejects.toThrow("not Base mainnet");
    expect(operation).not.toHaveBeenCalled(); expect(fallback.getNetwork).not.toHaveBeenCalled();
  });

  it("fails closed when the fallback reports the wrong chain", async () => {
    const primary = provider(); const fallback = provider(1n); const operation = vi.fn();
    await expect(withRpcReadFallback({ primary, fallback }, operation)).rejects.toThrow("not Base mainnet");
    expect(operation).not.toHaveBeenCalled();
  });

  it("redacts RPC credentials from diagnostic values", () => {
    expect(redactRpcUrl("https://base-mainnet.g.alchemy.com/v2/secret-key?token=also-secret")).toBe("https://base-mainnet.g.alchemy.com/…");
    expect(redactRpcUrl("not a url")).toBe("[invalid RPC URL]");
  });
});
