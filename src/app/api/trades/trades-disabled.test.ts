import { describe, expect, it } from "vitest";

import { POST as execute } from "./execute/route";
import { POST as submit } from "./[tradeId]/submission/route";

const request = (path: string) => new Request(`http://localhost:3000${path}`, { method: "POST", headers: { origin: "http://localhost:3000" } });
const jsonRequest = (path: string, body: unknown) => new Request(`http://localhost:3000${path}`, {
  method: "POST",
  headers: {
    origin: "http://localhost:3000",
    "content-type": "application/json",
    "idempotency-key": "disabled-boundary-test-1",
  },
  body: JSON.stringify(body),
});

describe("demo-only execution boundaries", () => {
  it("returns EXECUTION_DISABLED before parsing or mutating an execution request", async () => {
    const response = await execute(request("/api/trades/execute"));
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "EXECUTION_DISABLED" } });
  });

  it("returns EXECUTION_DISABLED before parsing or mutating a submission request", async () => {
    const response = await submit(request("/api/trades/not-a-real-id/submission"));
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "EXECUTION_DISABLED" } });
  });

  it("rejects complete future execution payloads before their schemas or repositories are touched", async () => {
    const executeResponse = await execute(jsonRequest("/api/trades/execute", {
      tradeId: "5b3e798c-e0e8-4ab5-9e37-d4526424eb8f",
      quoteFingerprint: "a".repeat(64),
      walletAddress: "0x1111111111111111111111111111111111111111",
      chainId: 8453,
      userConfirmed: true,
    }));
    const submissionResponse = await submit(jsonRequest("/api/trades/5b3e798c-e0e8-4ab5-9e37-d4526424eb8f/submission", {
      txHash: `0x${"aa".repeat(32)}`,
      walletAddress: "0x1111111111111111111111111111111111111111",
    }));

    expect(executeResponse.status).toBe(422);
    expect(submissionResponse.status).toBe(422);
    await expect(executeResponse.json()).resolves.toMatchObject({ error: { code: "EXECUTION_DISABLED" } });
    await expect(submissionResponse.json()).resolves.toMatchObject({ error: { code: "EXECUTION_DISABLED" } });
  });
});
