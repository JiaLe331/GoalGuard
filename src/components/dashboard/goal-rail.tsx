"use client";

import { Plus } from "@phosphor-icons/react";
import Link from "next/link";

import { RecentGoalsList } from "@/components/goals/recent-goals-list";
import { IntegrationStatus } from "@/components/integrations/integration-status";
import { TelegramAlertsCard } from "@/components/integrations/telegram-alerts-card";
import { MarketStrip } from "@/components/market/market-strip";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Goal, GoalType } from "@/lib/contracts";
import { formatUsd } from "@/lib/frontend/format";

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
export function GoalRail({ goal }: { goal: Goal | null }) {
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

      <RecentGoalsList activeGoalId={goal?.id ?? null} activeGoalStatus={goal?.status ?? null} />

      <MarketStrip />

      <TelegramAlertsCard />

      <IntegrationStatus compact />
    </div>
  );
}
