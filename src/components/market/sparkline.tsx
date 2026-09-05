"use client";

import { useId, useState } from "react";

export interface SparklinePoint {
  /** ISO timestamp for the reading. */
  at: string;
  value: number;
}

/**
 * A single-series trend line. One series, so there is no legend: the heading above it names the
 * measure (see the dataviz guidance -- a legend box for one series is noise).
 *
 * The line and its fill are drawn in SVG with a non-scaling stroke so the 2px weight survives the
 * horizontal stretch, while the endpoint marker, crosshair and tooltip are HTML positioned in
 * percentages. Keeping the round marks out of the stretched coordinate space is what stops them
 * rendering as ellipses at wide viewports.
 */
export function Sparkline({ points, formatValue, label, className = "" }: {
  points: readonly SparklinePoint[];
  formatValue: (value: number) => string;
  label: string;
  className?: string;
}) {
  const gradientId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Two points are the minimum that can describe a direction; one reading is a dot, not a trend.
  if (points.length < 2) return null;

  const values = points.map((point) => point.value);
  const low = Math.min(...values);
  const high = Math.max(...values);
  // A flat series would divide by zero and collapse onto the top edge; centre it instead.
  const span = high - low;
  const xFor = (index: number) => (index / (points.length - 1)) * 100;
  const yFor = (value: number) => (span === 0 ? 50 : ((high - value) / span) * 100);

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"}${xFor(index).toFixed(3)} ${yFor(point.value).toFixed(3)}`).join(" ");
  const areaPath = `${linePath} L100 100 L0 100 Z`;

  const first = points[0]!;
  const last = points[points.length - 1]!;
  const active = activeIndex === null ? null : points[activeIndex] ?? null;
  const marker = active ?? last;
  const markerIndex = activeIndex ?? points.length - 1;

  function pickNearest(event: React.PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    setActiveIndex(Math.round(ratio * (points.length - 1)));
  }

  return (
    <div
      className={`relative ${className}`}
      onPointerMove={pickNearest}
      onPointerLeave={() => setActiveIndex(null)}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="block h-full w-full overflow-visible"
        role="img"
        aria-label={`${label}. ${points.length} readings from ${formatValue(first.value)} to ${formatValue(last.value)}. Low ${formatValue(low)}, high ${formatValue(high)}.`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Crosshair only while pointing; the endpoint marker is always the latest reading. */}
      {active ? (
        <div
          className="pointer-events-none absolute inset-y-0 w-px bg-[color-mix(in_srgb,var(--accent)_55%,transparent)]"
          style={{ left: `${xFor(markerIndex)}%` }}
          aria-hidden="true"
        />
      ) : null}

      <div
        className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent)] ring-2 ring-[var(--data-card-bg)]"
        style={{ left: `${xFor(markerIndex)}%`, top: `${yFor(marker.value)}%` }}
        aria-hidden="true"
      />

      {active ? (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-y-full whitespace-nowrap rounded-[var(--radius-control)] bg-[var(--surface-raised)] px-2 py-1 text-xs shadow-[var(--shadow-float)]"
          style={{ left: `${xFor(markerIndex)}%`, transform: `translate(${markerIndex === 0 ? "0" : markerIndex === points.length - 1 ? "-100%" : "-50%"}, -100%)` }}
          role="status"
        >
          <span className="font-semibold tabular-nums text-[color:var(--foreground)]">{formatValue(active.value)}</span>
          <span className="ml-1.5 text-[color:var(--foreground-soft)]">
            {new Date(active.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZone: "UTC" })} UTC
          </span>
        </div>
      ) : null}
    </div>
  );
}
