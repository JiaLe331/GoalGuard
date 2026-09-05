"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { GoalStatus, GoalType } from "@/lib/contracts";
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

const statusCues: Record<GoalStatus, { label: string; dotClass: string }> = {
  draft: { label: "Draft", dotClass: "bg-[var(--foreground-muted)]" },
  searching: { label: "Finding options", dotClass: "bg-[var(--accent)]" },
  reviewing: { label: "Council review", dotClass: "bg-[var(--accent)]" },
  ready: { label: "Ready", dotClass: "bg-[var(--positive)]" },
  protected: { label: "Protected", dotClass: "bg-[var(--positive)]" },
  failed: { label: "Needs attention", dotClass: "bg-[var(--negative)]" },
};

const unknownStatusCue = { label: "Saved locally", dotClass: "bg-[var(--surface-strong)] ring-1 ring-inset ring-[var(--border-strong)]" };

// A cached snapshot from goal-creation time, not live status -- clicking through always
// re-hydrates the goal's real current state from the server (see GoalWorkspace's hydrate effect),
// so a stale label here never misrepresents what the goal actually is right now.
export function RecentGoalsList({ activeGoalId = null, activeGoalStatus = null }: { activeGoalId?: string | null; activeGoalStatus?: GoalStatus | null }) {
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
        {entries.map((entry) => {
          const active = entry.id === activeGoalId;
          const status = active ? activeGoalStatus ?? entry.status : entry.status;
          const cue = status ? statusCues[status] : unknownStatusCue;
          return (
            <li key={entry.id}>
              <Link
                href={`/goals/${entry.id}`}
                aria-current={active ? "page" : undefined}
                data-active={active ? "true" : undefined}
                title={entryLabel(entry)}
                className={`flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-card)] border px-2 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] ${active ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[color:var(--foreground)]" : "border-transparent hover:bg-[var(--surface-subtle)]"}`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className={`size-2 shrink-0 rounded-full ${cue.dotClass}`} aria-hidden="true" />
                  <span className="min-w-0 truncate">{entryLabel(entry)}</span>
                  <span className="sr-only">Status: {cue.label}.</span>
                </span>
                <span className="shrink-0 tabular-nums text-[color:var(--foreground-soft)]">{formatUsd(entry.protectedValueUsd)} · {formatDate(entry.createdAt)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
