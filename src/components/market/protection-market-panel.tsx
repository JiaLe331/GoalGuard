"use client";

import { ArrowClockwise, ArrowRight, TrendDown, TrendUp } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";

import { Sparkline, type SparklinePoint } from "@/components/market/sparkline";
import { ProtectionChainCard } from "@/components/market/protection-chain";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricCard } from "@/components/workflow/workflow-primitives";
import type { MarketSnapshot } from "@/lib/contracts";
import { ApiClientError, goalGuardApi } from "@/lib/frontend/api-client";
import { formatDate, formatPercentFromBps, formatUsd } from "@/lib/frontend/format";

/** The reference notional the worker prices the goal-free chain at (see market-snapshot.ts). */
const REFERENCE_NOTIONAL_USD = 100;

function costPoints(series: readonly MarketSnapshot[]): SparklinePoint[] {
  return series.flatMap((snapshot) => snapshot.costPer100Usd30d === null
    ? []
    : [{ at: snapshot.capturedAt, value: Number(snapshot.costPer100Usd30d) }]);
}

function TrendNote({ points }: { points: readonly SparklinePoint[] }) {
  if (points.length < 2) return null;
  const first = points[0]!.value;
  const last = points[points.length - 1]!.value;
  if (first === 0) return null;
  const changePct = ((last - first) / first) * 100;
  // Under a tenth of a percent is noise in a quote median, not a move worth naming.
  const flat = Math.abs(changePct) < 0.1;
  const Icon = changePct >= 0 ? TrendUp : TrendDown;
  const sinceLabel = formatDate(points[0]!.at, { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[color:var(--text-on-dark-muted)]">
      {flat ? null : <Icon className="size-4 shrink-0" aria-hidden="true" />}
      <span className="tabular-nums">
        {flat ? "Little changed" : `${changePct > 0 ? "+" : ""}${changePct.toFixed(1)}%`}
      </span>
      <span>since {sinceLabel} UTC</span>
    </p>
  );
}

/**
 * The workspace's default view: the live ETH protection market with no goal attached.
 *
 * Everything here comes from the worker's own snapshots, so the board is populated the moment the
 * workspace opens -- before a goal exists, before a wallet is connected, and without putting a
 * Thetanuts call in the page-load path. Quotes are priced at a $100 reference notional so the
 * headline is comparable across time; a goal-scoped search re-prices the same chain against that
 * goal's real protected value (see MarketOverview).
 */
export function ProtectionMarketPanel({ onCreateGoal }: { onCreateGoal?: () => void }) {
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [series, setSeries] = useState<MarketSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await goalGuardApi.getMarketSummary(signal);
      setSnapshot(response.data.snapshot);
      setSeries(response.data.series);
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError(reason instanceof ApiClientError ? reason.message : "The market snapshot is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => { void refresh(controller.signal); }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [refresh]);

  if (loading && !snapshot) {
    return (
      <Card tone="dark" className="p-5 sm:p-6" aria-busy="true" aria-label="Loading the live protection market">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-4 h-12 w-64" />
        <Skeleton className="mt-5 h-20 w-full" />
        <div className="metric-grid mt-5">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-24" />)}</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert tone="error" title="The protection market is unavailable">
        <p>{error}</p>
        <Button variant="secondary" className="mt-4" onClick={() => { void refresh(); }}>Retry</Button>
      </Alert>
    );
  }

  if (!snapshot) {
    return (
      <Alert tone="info" title="No market snapshot captured yet">
        The background worker has not recorded a snapshot. This board fills in after its first run — nothing is estimated in the meantime.
      </Alert>
    );
  }

  const points = costPoints(series);
  const chain = snapshot.chain ?? [];
  const observedLabel = formatDate(snapshot.capturedAt, { hour: "numeric", minute: "2-digit", timeZone: "UTC" });

  return (
    // An explicit minmax(0,...) column: grid items default to min-width:auto, which lets the
    // widest nowrap child (the observed-at badge) push the whole board past a phone viewport.
    <section aria-labelledby="protection-market-title" className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <Card tone="dark" className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-on-dark-muted)]">
              Live protection market · Thetanuts on Base
            </p>
            <h2 id="protection-market-title" className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--text-on-dark)]">
              Cost of safety
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-on-dark-muted)]">
              What the ETH put market currently charges to put a floor under ${REFERENCE_NOTIONAL_USD} of value for 30 days. A median of fillable quotes, not a forecast.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StatusBadge tone="info" label={`Observed ${observedLabel} UTC`} />
            <Button
              variant="ghost"
              className="size-11 px-0"
              aria-label="Refresh the protection market"
              onClick={() => { void refresh(); }}
              disabled={loading}
            >
              <ArrowClockwise className={`size-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-[minmax(0,auto)_minmax(0,1fr)] sm:items-end">
          <div>
            <p className="text-5xl font-semibold tabular-nums tracking-[-0.05em] text-[color:var(--text-on-dark)]">
              {snapshot.costPer100Usd30d === null ? "—" : formatUsd(snapshot.costPer100Usd30d)}
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-on-dark-muted)]">per ${REFERENCE_NOTIONAL_USD} protected · 30 days</p>
            <TrendNote points={points} />
          </div>
          <Sparkline
            className="h-20 w-full"
            points={points}
            label="Cost of safety per $100 protected, over the recorded snapshots"
            formatValue={(value) => formatUsd(value.toFixed(4))}
          />
        </div>

        {/* A deliberate 2x2 rather than the shared auto-fit grid: at the workspace's centre width
            auto-fit lands on three-plus-one, which reads as a wrapped row instead of a set. */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MetricCard label="Market IV" value={snapshot.medianIvBps === null ? "—" : formatPercentFromBps(snapshot.medianIvBps)} hint="Higher implied volatility means the market is pricing more movement." />
          <MetricCard label="ETH spot" value={formatUsd(snapshot.ethSpotUsd)} hint="Reference price from the same market read." />
          <MetricCard label="Live ETH puts" value={snapshot.optionCount.toString()} hint="Open put orders seen on Thetanuts at this snapshot." />
          <MetricCard label="Fillable now" value={chain.length.toString()} hint={`Quotes that actually fill at $${REFERENCE_NOTIONAL_USD} of protection.`} tone="accent" />
        </div>
      </Card>

      {/* Sits above the chain deliberately: the next action a visitor can take should not be
          buried under thirty rows of option quotes. */}
      {onCreateGoal ? (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div className="min-w-0">
            <h3 className="font-semibold tracking-[-0.02em]">Protect something specific</h3>
            <p className="mt-1 max-w-xl text-sm leading-6 text-[color:var(--foreground-soft)]">Name what the money is for and GoalGuard re-prices this chain against your amount, deadline, and loss limit — then puts it to the Gonka council.</p>
          </div>
          <Button className="shrink-0" onClick={onCreateGoal}>New goal <ArrowRight aria-hidden="true" /></Button>
        </Card>
      ) : null}

      {chain.length ? (
        <ProtectionChainCard
          chain={chain}
          showCoverage={false}
          initialGroups={2}
          title="Protection chain"
          description={`Every row is a live, fillable ETH put priced at $${REFERENCE_NOTIONAL_USD} of protection. Attach a goal to re-price the same chain against the amount you actually need to protect.`}
        />
      ) : (
        <Alert tone="info" title="Chain detail arrives with the next snapshot">
          This snapshot recorded the market headline but not its individual quotes. The chain appears after the worker&apos;s next capture.
        </Alert>
      )}
    </section>
  );
}
