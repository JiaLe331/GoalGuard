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

export function IntegrationStatus() {
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
    { name: "Local data", description: "SQLite audit records", ...data.database },
    { name: "Gonka", description: data.gonka.model ?? "AI router", ...data.gonka },
    {
      name: "Thetanuts",
      description: data.thetanuts.activeEthPutCount === null
        ? "Base options market"
        : `${data.thetanuts.activeEthPutCount} live ETH puts`,
      ...data.thetanuts,
    },
  ] : [];

  return (
    <section aria-labelledby="readiness-heading">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#91a398]">Service readiness</p>
          <h2 id="readiness-heading" className="text-xl font-semibold text-white">Live foundations</h2>
        </div>
        <Button variant="ghost" className="min-h-9 px-3" onClick={() => void refresh()} disabled={loading}>
          {loading ? "Checking…" : "Refresh"}
        </Button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-[#ff837a]/20 bg-[#ff837a]/10 p-4 text-sm text-[#ffc0bc]" role="alert">{error}</div>
      ) : (
        <div className="space-y-3" aria-busy={loading}>
          {loading && !data ? [0, 1, 2].map((item) => (
            <div key={item} className="h-[68px] animate-pulse rounded-2xl bg-white/[0.05]" />
          )) : items.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-black/10 p-4">
              <div>
                <p className="text-sm font-semibold text-white">{item.name}</p>
                <p className="mt-0.5 text-xs text-[#91a398]">{item.description}</p>
              </div>
              <StatusBadge label={labels[item.status] ?? item.status} tone={toneFor(item.status)} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
