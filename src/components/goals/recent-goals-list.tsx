"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { GoalType } from "@/lib/contracts";
import { formatDate, formatUsd } from "@/lib/frontend/format";
import { readRecentGoals, type RecentGoalEntry } from "@/lib/frontend/storage";

const goalLabels: Record<GoalType, string> = {
  rent: "Rent",
  tuition: "Tuition",
  travel: "Travel",
  emergency: "Emergency fund",
  custom: "Custom goal",
};

function entryLabel(entry: RecentGoalEntry) {
  return entry.customGoalLabel ?? goalLabels[entry.goalType];
}

// A cached snapshot from goal-creation time, not live status -- clicking through always
// re-hydrates the goal's real current state from the server (see GoalWorkspace's hydrate effect),
// so a stale label here never misrepresents what the goal actually is right now.
export function RecentGoalsList() {
  const [entries, setEntries] = useState<RecentGoalEntry[] | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setEntries(readRecentGoals()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  if (!entries || entries.length === 0) return null;
  return (
    <div className="mt-6 border-t border-[var(--border)] pt-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">Recent goals in this browser</p>
      <ul className="mt-3 space-y-1">
        {entries.map((entry) => (
          <li key={entry.id}>
            <Link href={`/goals/${entry.id}`} className="flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-card)] px-2 py-2 text-sm transition-colors hover:bg-[var(--surface-subtle)]">
              <span className="min-w-0 truncate">{entryLabel(entry)}</span>
              <span className="shrink-0 tabular-nums text-[color:var(--foreground-soft)]">{formatUsd(entry.protectedValueUsd)} · {formatDate(entry.createdAt)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
