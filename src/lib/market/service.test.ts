import { describe, expect, it, vi } from "vitest";

import type { MarketSnapshot } from "@/lib/contracts";
import { getLatestMarketSnapshot, type MarketSnapshotRepository } from "./service";

const firstSnapshot: MarketSnapshot = {
  capturedAt: "2026-08-31T12:00:00.000Z",
  ethSpotUsd: "3000",
  optionCount: 58,
  medianIvBps: 6500,
  costPer100Usd30d: "2.1",
};

describe("market service", () => {
  it("returns the newest worker snapshot", async () => {
    const repository: MarketSnapshotRepository = { listMarketSnapshots: vi.fn().mockResolvedValue([firstSnapshot]) };

    await expect(getLatestMarketSnapshot(repository)).resolves.toEqual(firstSnapshot);
    expect(repository.listMarketSnapshots).toHaveBeenCalledWith(1);
  });

  it("returns an honest empty state when no snapshot exists", async () => {
    const repository: MarketSnapshotRepository = { listMarketSnapshots: vi.fn().mockResolvedValue([]) };

    await expect(getLatestMarketSnapshot(repository)).resolves.toBeNull();
  });
});
