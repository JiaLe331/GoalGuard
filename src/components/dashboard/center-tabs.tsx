"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useRef } from "react";

export const centerTabItems = [
  { id: "market", label: "Market" },
  { id: "plan", label: "Plan" },
  { id: "scenarios", label: "Scenarios" },
  { id: "audit", label: "Audit" },
] as const;

export type CenterTab = (typeof centerTabItems)[number]["id"];

export function CenterTabs({ activeTab, onTabChange }: { activeTab: CenterTab; onTabChange: (tab: CenterTab) => void }) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function moveFocus(index: number, event: KeyboardEvent<HTMLButtonElement>) {
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % centerTabItems.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + centerTabItems.length) % centerTabItems.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = centerTabItems.length - 1;
    else return;
    event.preventDefault();
    const nextTab = centerTabItems[nextIndex]!;
    onTabChange(nextTab.id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div role="tablist" aria-label="Goal workspace views" className="grid min-w-0 grid-cols-2 gap-1 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-subtle)] p-1 sm:grid-cols-4">
      {centerTabItems.map((tab, index) => {
        const selected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            ref={(element) => { tabRefs.current[index] = element; }}
            id={`workspace-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={selected ? `workspace-panel-${tab.id}` : undefined}
            tabIndex={selected ? 0 : -1}
            data-state={selected ? "active" : "inactive"}
            className={`min-h-11 min-w-0 rounded-[var(--radius-control)] px-3 text-sm font-semibold transition-[background-color,color,box-shadow] duration-[var(--duration-fast)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus-ring)] sm:px-4 ${selected ? "bg-[var(--surface-raised)] text-[color:var(--foreground)] shadow-[var(--shadow-card)]" : "text-[color:var(--foreground-soft)] hover:bg-[var(--surface-hover)] hover:text-[color:var(--foreground)]"}`}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(event) => moveFocus(index, event)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function CenterTabPanel({ tab, activeTab, children }: { tab: CenterTab; activeTab: CenterTab; children: ReactNode }) {
  if (tab !== activeTab) return null;
  return (
    <div id={`workspace-panel-${tab}`} role="tabpanel" aria-labelledby={`workspace-tab-${tab}`} tabIndex={0} className="min-w-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus-ring)]">
      {children}
    </div>
  );
}
