import type { MarketSnapshot } from "@/lib/contracts";

export interface MarketSnapshotRepository {
  listMarketSnapshots(limit?: number): Promise<MarketSnapshot[]>;
}

/** Returns the newest worker snapshot without inventing a live value when history is empty. */
export async function getLatestMarketSnapshot(repository: MarketSnapshotRepository): Promise<MarketSnapshot | null> {
  return (await repository.listMarketSnapshots(1))[0] ?? null;
}
