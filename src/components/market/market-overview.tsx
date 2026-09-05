"use client";

import { ShieldCheck, WarningCircle } from "@phosphor-icons/react";
import Decimal from "decimal.js";

import { Accordion } from "@/components/ui/accordion";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProtectionChainCard } from "@/components/market/protection-chain";
import { MetricCard } from "@/components/workflow/workflow-primitives";
import type { Goal, ProtectionChainEntry, PublicProtectionCandidate } from "@/lib/contracts";
import { formatDate, formatPercentFromBps, formatUsd } from "@/lib/frontend/format";
import { groupRejections } from "@/lib/frontend/market";
import { deriveProtectionIndex } from "@/lib/thetanuts/protection-index";
import type { MarketContext } from "@/lib/frontend/workflow";

function rejectionDetails(entry: { strikeUsd: string | null; expiry: string | null; premiumUsd: string | null }) {
  const details = [
    entry.strikeUsd ? `strike ${formatUsd(entry.strikeUsd)}` : null,
    entry.expiry ? `ends ${formatDate(entry.expiry)}` : null,
    entry.premiumUsd ? `cost ${formatUsd(entry.premiumUsd)}` : null,
  ].filter(Boolean);
  return details.length ? details.join(" · ") : "Quote details were not available.";
}

function floorGaugePosition(value: string, lower: Decimal, span: Decimal) {
  if (span.lte(0)) return 50;
  return Math.max(0, Math.min(100, new Decimal(value).minus(lower).div(span).mul(100).toNumber()));
}

function FloorGauge({ spotUsd, candidate }: { spotUsd: string; candidate: ProtectionChainEntry }) {
  const floor = new Decimal(candidate.estimatedFloorUsd);
  const spot = new Decimal(spotUsd);
  const strike = new Decimal(candidate.strikeUsd);
  const low = Decimal.min(floor, spot, strike);
  const high = Decimal.max(floor, spot, strike);
  const rawSpan = high.minus(low);
  const padding = rawSpan.isZero() ? new Decimal(1) : rawSpan.mul("0.08");
  const lower = low.minus(padding);
  const span = rawSpan.plus(padding.mul(2));
  const floorPosition = floorGaugePosition(candidate.estimatedFloorUsd, lower, span);
  const spotPosition = floorGaugePosition(spotUsd, lower, span);
  const strikePosition = floorGaugePosition(candidate.strikeUsd, lower, span);
  return (
    <section aria-labelledby="floor-gauge-title" className="mt-6 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-raised)] p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[color:var(--positive)]" aria-hidden="true" />
        <div>
          <h3 id="floor-gauge-title" className="font-semibold tracking-[-0.02em]">Your floor, at a glance</h3>
          <p className="mt-1 text-sm leading-6 text-[color:var(--foreground-soft)]">This band compares the selected strike and estimated floor with ETH&apos;s current spot price. It is a snapshot, not a price forecast.</p>
        </div>
      </div>
      <div className="mt-6" role="img" aria-label={`Estimated floor ${formatUsd(candidate.estimatedFloorUsd)}, strike ${formatUsd(candidate.strikeUsd)}, current ETH spot ${formatUsd(spotUsd)}`}>
        <div className="relative h-12">
          <div className="absolute inset-x-0 top-5 h-2 rounded-full bg-[var(--surface-muted)]" />
          <div className="absolute top-4 h-4 w-1 rounded-full bg-[var(--positive)]" style={{ left: `${floorPosition}%` }} />
          <div className="absolute top-2 h-8 w-1.5 rounded-full bg-[var(--foreground)]" style={{ left: `${spotPosition}%` }} />
          <div className="absolute top-4 h-4 w-1 rounded-full bg-[var(--accent)]" style={{ left: `${strikePosition}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs tabular-nums">
          <p className="text-left text-[color:var(--positive)]">Floor<br /><span className="font-semibold text-[color:var(--foreground)]">{formatUsd(candidate.estimatedFloorUsd)}</span></p>
          <p className="text-center">Spot<br /><span className="font-semibold">{formatUsd(spotUsd)}</span></p>
          <p className="text-right text-[color:var(--accent-foreground)]">Strike<br /><span className="font-semibold text-[color:var(--foreground)]">{formatUsd(candidate.strikeUsd)}</span></p>
        </div>
      </div>
    </section>
  );
}

export function MarketOverview({ goal, market, selectedCandidate, stale = false }: { goal: Goal; market: MarketContext; selectedCandidate?: PublicProtectionCandidate | null; stale?: boolean }) {
  const index = deriveProtectionIndex({ chain: market.chain, protectedValueUsd: goal.protectedValueUsd, marketAsOf: market.marketAsOf });

  const rejections = groupRejections(market.rejected);
  const selectedChainEntry = selectedCandidate?.protocolOrderId
    ? market.chain.find((entry) => entry.protocolOrderId === selectedCandidate.protocolOrderId) ?? market.chain[0]
    : market.chain[0];
  const snapshotLabel = formatDate(market.marketAsOf, { hour: "numeric", minute: "2-digit", timeZone: "UTC" });

  return (
    <section aria-labelledby="market-overview-title">
      <Card tone="dark" className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-on-dark-muted)]">Live market context</p>
            <h2 id="market-overview-title" className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--text-on-dark)]">Cost of safety</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-on-dark-muted)]">What the current ETH put market charges to soften a loss. The headline is a median of fillable quotes, not a promise about future prices.</p>
          </div>
          <StatusBadge tone="info" label={`Observed ${snapshotLabel} UTC`} />
        </div>
        {stale ? <Alert className="mt-5" tone="warning" title="This market view belongs to the previous goal">The quotes stay visible for context, but find live protection again before relying on them.</Alert> : null}
        <div className="metric-grid mt-5">
          <MetricCard label="Protection cost" value={index.costPer100Usd30d ? formatUsd(index.costPer100Usd30d) : "—"} hint={index.sampleSize ? `Median of ${index.sampleSize} fillable quotes · per $100 for 30 days` : "Waiting for enough fillable quotes."} tone="accent" />
          <MetricCard label="Market IV" value={index.medianIvBps === null ? "—" : formatPercentFromBps(index.medianIvBps)} hint="Higher IV means the option market is pricing more movement." />
          <MetricCard label="ETH spot" value={formatUsd(market.ethSpotUsd)} hint="Current reference price from the live market response." />
          <MetricCard label="Fillable options" value={market.chain.length.toString()} hint="Viable vanilla ETH puts returned for this goal." />
        </div>
      </Card>

      <ProtectionChainCard
        className="mt-5"
        chain={market.chain}
        title="Protection chain"
        description="Every row is a live, fillable way to protect this goal. Cost and floor are shown as safety outcomes, not trading returns."
      >
        {rejections.length ? (
          <div className="mt-5">
            <Accordion title={`${market.rejected.length} quote${market.rejected.length === 1 ? "" : "s"} filtered out`}>
              <div className="space-y-4">
                <p className="text-xs leading-5">{market.chain.some((entry) => entry.settlementType === "cash") ? "These are the cash-settled quotes screened for this search; a physical fallback was not needed." : "The search checked cash quotes first and then the physical-settlement fallback where available."}</p>
                {rejections.map((group) => (
                  <div key={group.category}>
                    <div className="flex items-center justify-between gap-3"><p className="font-semibold text-[color:var(--foreground)]">{group.label}</p><span className="tabular-nums">{group.entries.length}</span></div>
                    <ul className="mt-2 space-y-1 text-xs leading-5">
                      {group.entries.slice(0, 3).map((entry, index) => <li key={`${entry.protocolOrderId ?? "unknown"}-${index}`}>{rejectionDetails(entry)}{entry.reasons[0] ? ` — ${entry.reasons[0]}` : ""}</li>)}
                      {group.entries.length > 3 ? <li>And {group.entries.length - 3} more in this category.</li> : null}
                    </ul>
                  </div>
                ))}
              </div>
            </Accordion>
          </div>
        ) : null}
      </ProtectionChainCard>

      {selectedChainEntry ? <FloorGauge spotUsd={market.ethSpotUsd} candidate={selectedChainEntry} /> : (
        <Alert className="mt-5" tone="info" title="Floor gauge will appear with a fillable quote"><span className="inline-flex items-center gap-2"><WarningCircle aria-hidden="true" />The live market did not provide a candidate to compare with ETH spot.</span></Alert>
      )}
    </section>
  );
}
