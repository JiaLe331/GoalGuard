// @vitest-environment node

import { describe, expect, it } from "vitest";

import { collectIntegrationStatus } from "./status";

describe("collectIntegrationStatus", () => {
  it("reports configured services independently", async () => {
    const status = await collectIntegrationStatus({
      database: async () => ({ status: "ready" }),
      gonka: async () => ({ status: "degraded", model: "model-a", requestId: null }),
      thetanuts: async () => ({ status: "ready", chainId: 8453, activeEthPutCount: 7, marketAsOf: "2026-08-31T12:00:00.000Z" }),
    });
    expect(status.gonka.status).toBe("degraded");
    expect(status.thetanuts.activeEthPutCount).toBe(7);
  });

  it("does not hide healthy services when one check throws", async () => {
    const status = await collectIntegrationStatus({
      database: async () => ({ status: "ready" }),
      gonka: async () => { throw new Error("offline"); },
      thetanuts: async () => ({ status: "unconfigured", chainId: 8453, activeEthPutCount: null, marketAsOf: null }),
    });
    expect(status.database.status).toBe("ready");
    expect(status.gonka.status).toBe("error");
    expect(status.thetanuts.status).toBe("unconfigured");
  });
});
