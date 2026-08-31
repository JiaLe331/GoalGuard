"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function GoalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center px-5"><Card className="max-w-xl p-8 text-center"><h1 className="text-2xl font-semibold text-white">The saved goal could not be displayed.</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">No transaction was submitted. Retry the current view or return to a new goal.</p><div className="mt-6 flex justify-center gap-3"><Button onClick={reset}>Retry</Button><Link href="/" className="inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold text-white">New goal</Link></div></Card></main>
  );
}
