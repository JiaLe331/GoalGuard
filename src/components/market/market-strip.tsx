"use client";

import { ArrowClockwise, Clock } from "@phosphor-icons/react";
import { useCallback, useEffect, useId, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { MarketSnapshot } from "@/lib/contracts";
import { ApiClientError, goalGuardApi } from "@/lib/frontend/api-client";
import { formatDate, formatPercentFromBps, formatUsd } from "@/lib/frontend/format";

function MarketMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3 border-b border-[var(--border)] py-2 last:border-b-0">
      <dt className="min-w-0 truncate text-xs text-[color:var(--foreground-soft)]">{label}</dt>
      <dd className="shrink-0 font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

export function MarketStrip() {
  const titleId = useId();
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await goalGuardApi.getMarketSummary(signal);
      setSnapshot(response.data.snapshot);
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
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [refresh]);

  return (
    <section aria-labelledby={titleId} className="border-t border-[var(--border)] pt-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">Market</p>
          <h2 id={titleId} className="mt-1 font-semibold tracking-[-0.02em]">Cost of safety</h2>
        </div>
        <Button
          variant="ghost"
          className="size-11 shrink-0 px-0"
          aria-label="Refresh market snapshot"
          onClick={() => { void refresh(); }}
          disabled={loading}
        >
          <ArrowClockwise className={`size-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />
        </Button>
      </div>

      {loading && !snapshot ? (
        <div className="mt-3 space-y-2" aria-busy="true" aria-label="Loading market snapshot">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-7 animate-pulse rounded-[var(--radius-control)] bg-[var(--surface-hover)] motion-reduce:animate-none" />)}
        </div>
      ) : error ? (
        <Alert className="mt-3 p-3 text-xs leading-5" tone="error" title="Market unavailable">
          <p>{error}</p>
          <Button variant="secondary" className="mt-3 min-h-11 px-3 text-xs" onClick={() => { void refresh(); }}>Retry snapshot</Button>
        </Alert>
      ) : snapshot ? (
        <>
          <div className="mt-3 rounded-[var(--radius-card)] bg-[var(--surface-subtle)] px-3">
            <dl>
              <MarketMetric label="Protection / $100 · 30d" value={snapshot.costPer100Usd30d === null ? "—" : formatUsd(snapshot.costPer100Usd30d)} />
              <MarketMetric label="Market IV" value={snapshot.medianIvBps === null ? "—" : formatPercentFromBps(snapshot.medianIvBps)} />
              <MarketMetric label="ETH spot" value={formatUsd(snapshot.ethSpotUsd)} />
              <MarketMetric label="Active ETH puts" value={snapshot.optionCount.toString()} />
            </dl>
          </div>
          <div className="mt-3 flex min-w-0 items-start gap-2">
            <Clock className="mt-0.5 size-4 shrink-0 text-[color:var(--foreground-soft)]" aria-hidden="true" />
            <p className="min-w-0 text-xs leading-5 text-[color:var(--foreground-soft)]">Observed {formatDate(snapshot.capturedAt, { hour: "numeric", minute: "2-digit", timeZone: "UTC" })} UTC</p>
            <StatusBadge label="Worker" tone="info" />
          </div>
        </>
      ) : (
        <div className="mt-3 rounded-[var(--radius-card)] border border-dashed border-[var(--border)] p-3 text-xs leading-5 text-[color:var(--foreground-soft)]" role="status">
          The background worker has not captured a market snapshot yet. This rail will fill in after its first run.
        </div>
      )}
    </section>
  );
}
