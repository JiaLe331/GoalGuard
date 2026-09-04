"use client";

import Link from "next/link";

import { NiulaiMascot } from "@/components/brand/niulai-mascot";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function GoalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center px-5">
      <Card className="max-w-xl p-8 text-center sm:p-10">
        <NiulaiMascot pose="safe-stop" size="md" className="mx-auto" />
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">Safe stop</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.05em]">The saved goal could not be displayed.</h1>
        <p className="mt-4 text-sm leading-6 text-[color:var(--foreground-soft)]">No transaction was submitted. Retry the current view or return to a new goal.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={reset}>Retry</Button>
          <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border)] px-5 text-sm font-semibold">New goal</Link>
        </div>
      </Card>
    </main>
  );
}
