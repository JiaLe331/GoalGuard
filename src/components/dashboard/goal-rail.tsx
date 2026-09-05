"use client";

import { Plus } from "@phosphor-icons/react";
import Link from "next/link";

import { RecentGoalsList } from "@/components/goals/recent-goals-list";
import { IntegrationStatus } from "@/components/integrations/integration-status";
import { MarketStrip } from "@/components/market/market-strip";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Goal, GoalStatus, GoalType } from "@/lib/contracts";
import { formatUsd } from "@/lib/frontend/format";

/** A read-only goal any visitor may open, resolved on the server (see lib/server/demo-goal). */
export interface DemoGoalSummary {
  id: string;
  goalType: GoalType;
  customGoalLabel: string | null;
  protectedValueUsd: string;
  status: GoalStatus;
}

const goalLabels: Record<GoalType, string> = {
  rent: "Rent",
  tuition: "Tuition",
  travel: "Travel",
  emergency: "Emergency fund",
  custom: "Custom goal",
};

const activeTone = {
  draft: "neutral", searching: "info", reviewing: "info", ready: "ready", protected: "ready", failed: "error",
} as const;

const activeLabel = {
  draft: "Draft", searching: "Finding options", reviewing: "In review", ready: "Ready", protected: "Protected", failed: "Needs attention",
} as const;

// Left rail: what you are working on, what you worked on before, and whether the services this
// depends on are actually up. Deliberately reuses RecentGoalsList and IntegrationStatus rather
// than restating either.
export function GoalRail({ goal, demoGoal = null }: { goal: Goal | null; demoGoal?: DemoGoalSummary | null }) {
  // Shown whenever the demo goal is not already the one open, so a visitor with no history of
  // their own still has a real, fully-reviewed goal to look at rather than an empty rail.
  const showDemoGoal = demoGoal !== null && demoGoal.id !== goal?.id;
  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/goals/new"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--button-primary-bg)] px-4 text-sm font-semibold text-[color:var(--button-primary-fg)] transition-[background-color,transform] duration-[var(--duration-press)] hover:bg-[var(--button-primary-hover)] active:scale-[0.98]"
      >
        <Plus className="size-4" aria-hidden="true" />New goal
      </Link>

      {goal ? (
        <section aria-label="Active goal">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">Active goal</p>
          <div className="mt-2 rounded-[var(--radius-card)] bg-[var(--surface-subtle)] p-3">
            <p className="truncate font-semibold tracking-[-0.02em]">{goal.customGoalLabel ?? goalLabels[goal.goalType]}</p>
            <p className="mt-0.5 text-sm tabular-nums text-[color:var(--foreground-soft)]">{formatUsd(goal.protectedValueUsd)}</p>
            <div className="mt-2.5"><StatusBadge tone={activeTone[goal.status]} label={activeLabel[goal.status]} /></div>
          </div>
        </section>
      ) : null}

      {showDemoGoal ? (
        <section aria-label="Example goal">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">Example goal</p>
          <Link
            href={`/goals/${demoGoal.id}`}
            className="mt-2 flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-card)] border border-dashed border-[var(--border-strong)] px-3 py-2.5 text-sm transition-colors hover:bg-[var(--surface-subtle)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          >
            <span className="min-w-0 truncate font-medium">{demoGoal.customGoalLabel ?? goalLabels[demoGoal.goalType]}</span>
            <span className="shrink-0 tabular-nums text-[color:var(--foreground-soft)]">{formatUsd(demoGoal.protectedValueUsd)}</span>
          </Link>
          <p className="mt-1.5 text-xs leading-5 text-[color:var(--foreground-soft)]">A finished council review you can open on any device.</p>
        </section>
      ) : null}

      <RecentGoalsList activeGoalId={goal?.id ?? null} activeGoalStatus={goal?.status ?? null} />

      <MarketStrip />

      <IntegrationStatus compact />
    </div>
  );
}
