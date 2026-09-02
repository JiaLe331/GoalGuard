"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function GoalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center px-5">
      <Card className="max-w-xl p-8 text-center sm:p-10">
        <span className="brand-shield mx-auto" aria-hidden="true" />
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-soft)]">Safe stop</p>
        <h1 className="mt-2 font-display text-4xl">The saved goal could not be displayed.</h1>
        <p className="mt-4 text-sm leading-6 text-[var(--foreground-soft)]">No transaction was submitted. Retry the current view or return to a new goal.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={reset}>Retry</Button>
          <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border)] px-5 text-sm font-semibold">New goal</Link>
        </div>
      </Card>
    </main>
  );
}
