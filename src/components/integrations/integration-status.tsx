"use client";

import { useCallback, useEffect, useState } from "react";

import type { IntegrationStatusResponse } from "@/lib/contracts";
import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";

type StatusData = IntegrationStatusResponse["data"];

const labels: Record<string, string> = {
  ready: "Ready",
  unconfigured: "Needs setup",
  degraded: "Request ID missing",
  error: "Unavailable",
};

function toneFor(status: string): StatusTone {
  if (status === "ready") return "ready";
  if (status === "unconfigured" || status === "degraded") return "warning";
  return "error";
}

export function IntegrationStatus({ compact = false }: { compact?: boolean } = {}) {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/integrations/status", { cache: "no-store" });
      if (!response.ok) throw new Error("GoalGuard could not read integration status.");
      const payload = (await response.json()) as IntegrationStatusResponse;
      setData(payload.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Integration status is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const items = data ? [
    { name: "Supabase data", description: "PostgreSQL audit records", ...data.database },
    { name: "Gonka", description: data.gonka.model ?? "AI router", ...data.gonka },
    {
      name: "Thetanuts",
      description: data.thetanuts.activeEthPutCount === null
        ? "Base options market"
        : `${data.thetanuts.activeEthPutCount} live ETH puts`,
      ...data.thetanuts,
    },
  ] : [];

  if (compact) {
    return (
      <section aria-label="Service readiness">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">Services</p>
          <button
            type="button"
            className="min-h-8 rounded-full px-2 text-xs font-semibold text-[color:var(--foreground-soft)] hover:text-[color:var(--foreground)] disabled:opacity-50"
            onClick={() => void refresh()}
            disabled={loading}
          >
            {loading ? "Checking…" : "Refresh"}
          </button>
        </div>
        {error ? (
          <p className="mt-2 text-xs text-[color:var(--foreground-soft)]" role="alert">{error}</p>
        ) : (
          <ul className="mt-2 space-y-1" aria-busy={loading}>
            {loading && !data ? [0, 1, 2].map((item) => (
              <li key={item} className="h-6 animate-pulse rounded-full bg-[var(--surface-hover)] motion-reduce:animate-none" />
            )) : items.map((item) => (
              <li key={item.name} className="flex min-h-7 items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-[color:var(--foreground-soft)]">{item.name}</span>
                <StatusBadge label={labels[item.status] ?? item.status} tone={toneFor(item.status)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <section aria-labelledby="readiness-heading">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="section-eyebrow text-[color:var(--foreground-muted)]">Service readiness</p>
          <h3 id="readiness-heading" className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">Current connections</h3>
        </div>
        <Button variant="secondary" className="min-h-11 px-4" onClick={() => void refresh()} disabled={loading}>
          {loading ? "Checking…" : "Refresh"}
        </Button>
      </div>

      {error ? (
        <div className="rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--negative)_38%,var(--border))] bg-[color-mix(in_srgb,var(--negative)_7%,var(--surface))] p-4 text-sm text-[color:var(--foreground-soft)]" role="alert">{error}</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3" aria-busy={loading}>
          {loading && !data ? [0, 1, 2].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-[var(--radius-card)] bg-[var(--surface-hover)] motion-reduce:animate-none" />
          )) : items.map((item) => (
            <div key={item.name} className="flex min-h-28 flex-col items-start justify-between gap-4 rounded-[var(--radius-card)] bg-[var(--surface-raised)] p-5">
              <div>
                <p className="font-semibold tracking-[-0.02em] text-[color:var(--foreground)]">{item.name}</p>
                <p className="mt-1 text-sm text-[color:var(--foreground-soft)]">{item.description}</p>
              </div>
              <StatusBadge label={labels[item.status] ?? item.status} tone={toneFor(item.status)} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
