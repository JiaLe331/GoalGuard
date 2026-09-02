import { describe, expect, it } from "vitest";

import { POST as execute } from "./execute/route";
import { POST as submit } from "./[tradeId]/submission/route";

const request = (path: string) => new Request(`http://localhost:3000${path}`, { method: "POST", headers: { origin: "http://localhost:3000" } });

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
});
