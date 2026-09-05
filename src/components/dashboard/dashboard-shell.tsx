"use client";

import type { ReactNode } from "react";

// Persistent three-column workspace. The rails stay mounted across every workflow stage so the
// goal, the council and the service status never disappear just because the centre changed.
//
// The centre keeps the `workflow-stage` class deliberately: it supplies the
// `container-type: inline-size` that ScenarioComparison's `@container` layout depends on
// (globals.css), and the visual regression suite waits on it.
export function DashboardShell({ left, right, progress, children }: {
  left: ReactNode;
  right: ReactNode;
  progress?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="page-shell py-4 sm:py-6">
      <div className="grid items-start gap-5 lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_22rem]">
        <nav
          aria-label="Goals"
          className="order-2 min-w-0 lg:order-none lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7.5rem)] lg:overflow-y-auto lg:pb-4"
        >
          {left}
        </nav>

        <div className="order-1 min-w-0 lg:order-none">
          {progress ? <div className="mb-4 rounded-[var(--radius-card)] bg-[var(--surface-subtle)] px-4 py-3">{progress}</div> : null}
          <div className="workflow-stage min-w-0">{children}</div>
        </div>

        <aside
          aria-label="AI Council"
          className="order-3 hidden min-w-0 xl:order-none xl:block xl:sticky xl:top-24 xl:max-h-[calc(100dvh-7.5rem)] xl:overflow-y-auto xl:pb-4"
        >
          {right}
        </aside>
      </div>
    </div>
  );
}
