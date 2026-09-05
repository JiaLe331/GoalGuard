"use client";

import { ChartLine } from "@phosphor-icons/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ProtectionChainEntry } from "@/lib/contracts";
import { formatBaseUnits, formatDate, formatPercentFromBps, formatUsd } from "@/lib/frontend/format";

/** Groups a chain by expiry day, ascending, so the table reads as a real option chain. */
export function expiryGroups(chain: readonly ProtectionChainEntry[]) {
  const grouped = new Map<string, ProtectionChainEntry[]>();
  for (const entry of chain) {
    const key = entry.expiry.slice(0, 10);
    grouped.set(key, [...(grouped.get(key) ?? []), entry]);
  }
  return [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right));
}

export function ChainRow({ entry, showCoverage = true }: { entry: ProtectionChainEntry; showCoverage?: boolean }) {
  return (
    <div className={`grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-raised)] p-4 sm:items-center sm:gap-3 ${showCoverage ? "sm:grid-cols-[1fr_1fr_1fr_1fr_1.2fr_1.3fr]" : "sm:grid-cols-[1fr_1fr_1fr_1.2fr_1.3fr]"}`}>
      <div><p className="text-xs text-[color:var(--foreground-soft)]">Strike</p><p className="mt-1 font-semibold tabular-nums">{formatUsd(entry.strikeUsd)}</p></div>
      <div><p className="text-xs text-[color:var(--foreground-soft)]">Cost</p><p className="mt-1 font-semibold tabular-nums">{formatUsd(entry.premiumUsd)}</p></div>
      <div><p className="text-xs text-[color:var(--foreground-soft)]">Floor</p><p className="mt-1 font-semibold tabular-nums">{formatUsd(entry.estimatedFloorUsd)}</p></div>
      {showCoverage ? <div><p className="text-xs text-[color:var(--foreground-soft)]">Coverage</p><p className="mt-1 font-semibold tabular-nums">{formatPercentFromBps(entry.goalCoverageBps)}</p></div> : null}
      <div><p className="text-xs text-[color:var(--foreground-soft)]">Depth</p><p className="mt-1 truncate font-semibold tabular-nums">{formatBaseUnits(entry.availableQuantityBaseUnits, entry.settlementTokenDecimals)} {entry.settlementTokenSymbol}</p></div>
      <div><p className="text-xs text-[color:var(--foreground-soft)]">IV · settlement</p><p className="mt-1 font-semibold tabular-nums">{entry.impliedVolatilityBps === null ? "—" : formatPercentFromBps(entry.impliedVolatilityBps)} · {entry.settlementType}</p></div>
    </div>
  );
}

/**
 * The chain table shared by the goal-scoped market view and the goal-free workspace board.
 * `showCoverage` is off for the goal-free board, where every quote is priced at the same $100
 * reference notional and a coverage column would repeat "100%" on every row.
 */
export function ProtectionChainCard({ chain, title, description, showCoverage = true, initialGroups, className = "", children }: {
  chain: readonly ProtectionChainEntry[];
  title: string;
  description: string;
  showCoverage?: boolean;
  /** Expiries to show before the "show everything" control. Omit to always show the whole chain. */
  initialGroups?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const allGroups = expiryGroups(chain);
  // The nearest expiries are the ones a reader is actually choosing between; the long tail is
  // real and reachable, but it should not push everything else off the page by default.
  const collapsed = initialGroups !== undefined && !expanded && allGroups.length > initialGroups;
  const groups = collapsed ? allGroups.slice(0, initialGroups) : allGroups;
  const hiddenQuotes = collapsed ? allGroups.slice(initialGroups).reduce((total, [, entries]) => total + entries.length, 0) : 0;
  return (
    <Card className={`p-5 sm:p-6 ${className}`}>
      <div className="flex items-start gap-3">
        <ChartLine className="mt-0.5 size-5 shrink-0 text-[color:var(--accent)]" aria-hidden="true" />
        <div><h2 className="font-semibold tracking-[-0.02em]">{title}</h2><p className="mt-1 text-sm leading-6 text-[color:var(--foreground-soft)]">{description}</p></div>
      </div>
      {groups.length ? (
        <div className="mt-5 space-y-5">
          {groups.map(([expiry, entries]) => (
            <section key={expiry} aria-labelledby={`market-expiry-${expiry}`}>
              <div className="mb-2 flex items-center justify-between gap-3"><h3 id={`market-expiry-${expiry}`} className="text-sm font-semibold">Expires {formatDate(entries[0]!.expiry)}</h3><span className="text-xs text-[color:var(--foreground-soft)]">{entries.length} option{entries.length === 1 ? "" : "s"}</span></div>
              <div className="space-y-2">{entries.map((entry) => <ChainRow key={entry.protocolOrderId} entry={entry} showCoverage={showCoverage} />)}</div>
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-[var(--radius-card)] border border-dashed border-[var(--border)] p-5 text-sm leading-6 text-[color:var(--foreground-soft)]">No fillable options survived the current protection constraints.</div>
      )}
      {collapsed ? (
        <Button variant="secondary" className="mt-4 w-full" onClick={() => setExpanded(true)}>
          Show {hiddenQuotes} more quote{hiddenQuotes === 1 ? "" : "s"} across {allGroups.length - groups.length} later {allGroups.length - groups.length === 1 ? "expiry" : "expiries"}
        </Button>
      ) : null}
      {children}
    </Card>
  );
}
