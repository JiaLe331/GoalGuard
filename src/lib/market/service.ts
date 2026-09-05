import type { MarketSnapshot } from "@/lib/contracts";

export interface MarketSnapshotRepository {
  listMarketSnapshots(limit?: number): Promise<MarketSnapshot[]>;
}

/** Returns the newest worker snapshot without inventing a live value when history is empty. */
export async function getLatestMarketSnapshot(repository: MarketSnapshotRepository): Promise<MarketSnapshot | null> {
  return (await repository.listMarketSnapshots(1))[0] ?? null;
}

/**
 * Recent snapshots in ascending capture order, ready to plot left to right. The repository
 * returns newest first, so this reverses rather than asking the database for a second ordering.
 * Short history is normal early in a worker's life and is left short instead of padded.
 */
export async function getMarketSeries(repository: MarketSnapshotRepository, limit = 24): Promise<MarketSnapshot[]> {
  return (await repository.listMarketSnapshots(limit)).reverse();
}
