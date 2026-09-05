"use client";

import { TrendDown } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { useId, useMemo, useState } from "react";

import type { Goal, PublicProtectionCandidate } from "@/lib/contracts";
import { formatUsd } from "@/lib/frontend/format";
import {
  computeStressOutcome,
  minStressShockBps,
  strikeShockBps,
  STRESS_TEST_DEFAULT_SHOCK_BPS,
  STRESS_TEST_MAX_SHOCK_BPS,
  STRESS_TEST_PRESETS,
} from "@/lib/protection/stress-test";

function clampPct(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function OutcomeBar({ label, valueUsd, maxUsd, tone }: { label: string; valueUsd: string; maxUsd: number; tone: "muted" | "accent" }) {
  const reducedMotion = useReducedMotion();
  const width = maxUsd <= 0 ? 0 : clampPct((Number(valueUsd) / maxUsd) * 100);
  return (
    <div className="grid min-w-0 grid-cols-[6rem_minmax(0,1fr)_5.5rem] items-center gap-3 sm:grid-cols-[7.5rem_minmax(0,1fr)_6rem]">
      <span className="truncate text-xs font-semibold text-[color:var(--foreground-soft)]">{label}</span>
      <div className="h-3 overflow-hidden rounded-full bg-[var(--scenario-track)]" aria-hidden="true">
        <motion.div
          className={`h-full min-w-1 origin-left rounded-full ${tone === "accent" ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]"}`}
          initial={reducedMotion ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: `${Math.max(2, width)}%` }}
        />
      </div>
      <span className="text-right text-sm font-semibold tabular-nums">{formatUsd(valueUsd)}</span>
    </div>
  );
}

/**
 * An interactive "what if ETH crashes?" lens on the already-selected, live candidate. Every
 * number is the real deterministic put-payoff formula (see computeStressOutcome, mirroring
 * scenario() in src/lib/thetanuts/strategy.ts) applied to a hypothetical settlement price the
 * visitor picks -- never a live order, a forecast, or fake market data.
 */
export function ProtectionStressTest({ goal, candidate }: { goal: Goal; candidate: PublicProtectionCandidate }) {
  const sliderId = useId();
  const strikeLabelId = `${sliderId}-strike`;
  const [shockBps, setShockBps] = useState<number>(STRESS_TEST_DEFAULT_SHOCK_BPS);

  const spotUsd = useMemo(
    () => candidate.scenarios.find((entry) => entry.key === "flat")?.settlementPriceUsd ?? candidate.strikeUsd,
    [candidate.scenarios, candidate.strikeUsd],
  );
  const strikeBps = useMemo(() => strikeShockBps(candidate.strikeUsd, spotUsd), [candidate.strikeUsd, spotUsd]);
  const minShockBps = useMemo(() => minStressShockBps(strikeBps), [strikeBps]);
  const outcome = useMemo(
    () => computeStressOutcome(
      { protectedValueUsd: goal.protectedValueUsd, strikeUsd: candidate.strikeUsd, quantityUnderlying: candidate.quantityUnderlying, premiumUsd: candidate.premiumUsd, spotUsd },
      shockBps,
    ),
    [goal.protectedValueUsd, candidate.strikeUsd, candidate.quantityUnderlying, candidate.premiumUsd, spotUsd, shockBps],
  );

  const trackPct = (bps: number) => clampPct(((bps - minShockBps) / (STRESS_TEST_MAX_SHOCK_BPS - minShockBps)) * 100);
  const currentPct = trackPct(0);
  const strikePct = trackPct(strikeBps);
  // The two ticks (drawn at their exact positions above) can sit close together for a
  // near-the-money put -- close enough that their captions below would overlap. Nudge the
  // captions apart symmetrically around their true midpoint; the ticks themselves never move.
  const [strikeLabelPct, currentLabelPct] = useMemo(() => {
    const minGapPct = 18;
    const gap = currentPct - strikePct;
    if (Math.abs(gap) >= minGapPct) return [strikePct, currentPct];
    const midpoint = (strikePct + currentPct) / 2;
    const direction = gap >= 0 ? 1 : -1;
    return [
      clampPct(midpoint - (direction * minGapPct) / 2, 10, 90),
      clampPct(midpoint + (direction * minGapPct) / 2, 10, 90),
    ];
  }, [strikePct, currentPct]);
  const activePreset = STRESS_TEST_PRESETS.find((preset) => preset.shockBps === shockBps) ?? null;
  const shockPct = Math.abs(shockBps / 100);
  const maxBarUsd = Math.max(Number(outcome.noProtectionFinalUsd), Number(outcome.goalGuardFinalUsd), 1);

  return (
    <div>
      <div className="flex items-center gap-2">
        <TrendDown className="size-5 text-[color:var(--accent)]" aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">Stress test</p>
      </div>
      <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">Stress test your protection</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--foreground-soft)]">
        Pick a hypothetical ETH move and watch this candidate&apos;s real strike, quantity, and premium play out. This is a live calculation on the selected quote &mdash; not a forecast, a new order, or a live position.
      </p>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Preset ETH price shocks">
        {STRESS_TEST_PRESETS.map((preset) => {
          const active = activePreset?.shockBps === preset.shockBps;
          return (
            <button
              key={preset.label}
              type="button"
              aria-pressed={active}
              onClick={() => setShockBps(preset.shockBps)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-[background-color,border-color,color] duration-[var(--duration-press)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] ${active ? "border-[var(--accent)] bg-[var(--accent)] text-[color:var(--accent-foreground)]" : "border-[var(--surface-muted)] bg-[var(--surface-muted)] text-[color:var(--foreground-soft)] hover:border-[var(--border-strong)] hover:text-[color:var(--foreground)]"}`}
            >
              {preset.label}
            </button>
          );
        })}
        <span
          className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold ${activePreset ? "border-[var(--surface-muted)] bg-[var(--surface-muted)] text-[color:var(--foreground-soft)]" : "border-[var(--accent)] bg-[var(--accent)] text-[color:var(--accent-foreground)]"}`}
        >
          Custom
        </span>
      </div>

      <div className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor={sliderId} className="text-xs font-semibold uppercase tracking-[0.1em] text-[color:var(--foreground-soft)]">ETH price shock</label>
          <span className="text-sm font-semibold tabular-nums">
            {formatUsd(outcome.settlementPriceUsd)} <span className="text-[color:var(--foreground-soft)]">({shockBps <= 0 ? "-" : "+"}{shockPct.toFixed(0)}%)</span>
          </span>
        </div>
        <div className="relative mt-4 h-6">
          <div className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 overflow-hidden rounded-full bg-[var(--scenario-track)]" aria-hidden="true">
            <div className="absolute inset-y-0 left-0 bg-[var(--accent-soft)]" style={{ width: `${strikePct}%` }} />
          </div>
          <div className="absolute top-1/2 h-5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--foreground)]" style={{ left: `${strikePct}%` }} aria-hidden="true" />
          <div className="absolute top-1/2 h-5 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--border-strong)]" style={{ left: `${currentPct}%` }} aria-hidden="true" />
          <input
            id={sliderId}
            type="range"
            min={minShockBps}
            max={STRESS_TEST_MAX_SHOCK_BPS}
            step={100}
            value={shockBps}
            onChange={(event) => setShockBps(Number(event.target.value))}
            className="stress-slider absolute inset-0 w-full cursor-pointer appearance-none bg-transparent"
            aria-describedby={strikeLabelId}
            aria-valuetext={`${formatUsd(outcome.settlementPriceUsd)}, ${shockBps < 0 ? "down" : shockBps > 0 ? "up" : "flat,"} ${shockBps !== 0 ? `${shockPct.toFixed(0)} percent from the current price` : ""}`}
          />
        </div>
        <div className="relative mt-1 h-9 text-xs text-[color:var(--foreground-soft)]">
          <span className="absolute -translate-x-1/2 whitespace-nowrap text-center" style={{ left: `${currentLabelPct}%` }}>
            Current ETH<br /><span className="tabular-nums text-[color:var(--foreground)]">{formatUsd(spotUsd)}</span>
          </span>
          <span id={strikeLabelId} className="absolute -translate-x-1/2 whitespace-nowrap text-center font-semibold text-[color:var(--foreground)]" style={{ left: `${strikeLabelPct}%` }}>
            Strike<br /><span className="tabular-nums">{formatUsd(candidate.strikeUsd)}</span>
          </span>
        </div>
      </div>

      <p className="mt-5 text-lg font-semibold tracking-[-0.02em]">
        If ETH {shockBps < 0 ? "falls" : shockBps > 0 ? "rises" : "stays flat"}{shockBps !== 0 ? ` ${shockPct.toFixed(0)}%` : ""}
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[26rem] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th scope="col" className="w-2/5" />
              <th scope="col" className="rounded-t-[var(--radius-control)] bg-[var(--surface-muted)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--foreground-soft)]">No protection</th>
              <th scope="col" className="rounded-t-[var(--radius-control)] bg-[var(--accent-soft)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--accent-soft-foreground)]">GoalGuard</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" className="px-3 py-2 text-left font-normal text-[color:var(--foreground-soft)]">ETH value</th>
              <td className="bg-[var(--surface-muted)] px-3 py-2 tabular-nums">{formatUsd(outcome.underlyingValueUsd)}</td>
              <td className="bg-[var(--accent-soft)] px-3 py-2 tabular-nums text-[color:var(--accent-soft-foreground)]">{formatUsd(outcome.underlyingValueUsd)}</td>
            </tr>
            <tr>
              <th scope="row" className="px-3 py-2 text-left font-normal text-[color:var(--foreground-soft)]">Option payoff</th>
              <td className="bg-[var(--surface-muted)] px-3 py-2 tabular-nums text-[color:var(--foreground-soft)]">&mdash;</td>
              <td className="bg-[var(--accent-soft)] px-3 py-2 tabular-nums text-[color:var(--accent-soft-foreground)]">+{formatUsd(outcome.optionPayoffUsd)}</td>
            </tr>
            <tr>
              <th scope="row" className="px-3 py-2 text-left font-normal text-[color:var(--foreground-soft)]">Premium</th>
              <td className="bg-[var(--surface-muted)] px-3 py-2 tabular-nums text-[color:var(--foreground-soft)]">&mdash;</td>
              <td className="bg-[var(--accent-soft)] px-3 py-2 tabular-nums text-[color:var(--accent-soft-foreground)]">-{formatUsd(outcome.premiumUsd)}</td>
            </tr>
            <tr>
              <th scope="row" className="rounded-bl-[var(--radius-control)] bg-[var(--surface-muted)] px-3 py-2.5 text-left font-semibold">Final value</th>
              <td className="bg-[var(--surface-muted)] px-3 py-2.5 font-semibold tabular-nums">{formatUsd(outcome.noProtectionFinalUsd)}</td>
              <td className="rounded-br-[var(--radius-control)] bg-[var(--accent-soft)] px-3 py-2.5 font-semibold tabular-nums text-[color:var(--accent-soft-foreground)]">{formatUsd(outcome.goalGuardFinalUsd)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-2.5">
        <OutcomeBar label="No protection" valueUsd={outcome.noProtectionFinalUsd} maxUsd={maxBarUsd} tone="muted" />
        <OutcomeBar label="GoalGuard" valueUsd={outcome.goalGuardFinalUsd} maxUsd={maxBarUsd} tone="accent" />
      </div>

      <div
        className={`mt-5 rounded-[var(--radius-card)] border p-4 ${outcome.breachesStrike ? "border-[var(--positive)] bg-[var(--positive-surface)]" : "border-[var(--border)] bg-[var(--surface-muted)]"}`}
        role="status"
        aria-live="polite"
      >
        {outcome.breachesStrike ? (
          <p className="text-sm leading-6"><span className="font-semibold text-[color:var(--positive)]">Downside avoided: {formatUsd(outcome.downsideAvoidedUsd)}</span> at this hypothetical price.</p>
        ) : (
          <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">This move doesn&apos;t reach the strike, so the {formatUsd(outcome.premiumUsd)} premium costs more than it returns here &mdash; the floor is designed to matter once ETH crosses the strike line above.</p>
        )}
      </div>
    </div>
  );
}
