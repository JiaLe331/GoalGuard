"use client";

import { AirplaneTilt, ArrowRight, FirstAidKit, GraduationCap, House, Sparkle, type Icon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { GoalDraft, GoalType } from "@/lib/contracts";
import { ApiClientError, goalGuardApi } from "@/lib/frontend/api-client";
import { saveActiveGoalId, storageKeys } from "@/lib/frontend/storage";

const categories: ReadonlyArray<{ label: string; value: GoalType; icon: Icon }> = [
  { label: "Rent", value: "rent", icon: House },
  { label: "Tuition", value: "tuition", icon: GraduationCap },
  { label: "Travel", value: "travel", icon: AirplaneTilt },
  { label: "Emergency", value: "emergency", icon: FirstAidKit },
  { label: "Custom", value: "custom", icon: Sparkle },
];

interface SavedDraft {
  category?: GoalType;
  message?: string;
  draft?: GoalDraft;
}

export function GoalComposer() {
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);
  const [category, setCategory] = useState<GoalType | null>(null);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<GoalDraft>({});
  const [clarification, setClarification] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiClientError | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKeys.draft);
    if (!saved) return;
    try {
      const value = JSON.parse(saved) as SavedDraft;
      queueMicrotask(() => {
        if (categories.some((item) => item.value === value.category)) setCategory(value.category ?? null);
        if (typeof value.message === "string") setMessage(value.message.slice(0, 4000));
        if (value.draft && typeof value.draft === "object") setDraft(value.draft);
      });
    } catch {
      window.localStorage.removeItem(storageKeys.draft);
    }
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!message && !category && Object.keys(draft).length === 0) return;
      window.localStorage.setItem(storageKeys.draft, JSON.stringify({ category: category ?? undefined, message, draft } satisfies SavedDraft));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [category, draft, message]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      setError(new ApiClientError("Describe the money and deadline you want to protect first.", "VALIDATION_ERROR", false, { message: ["Enter a protection goal."] }));
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const response = await goalGuardApi.parseGoal({
        message: trimmed,
        draft: { ...draft, ...(category ? { goalType: category } : {}) },
        locale: "en",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }, controller.signal);
      if (response.data.goal) {
        saveActiveGoalId(response.data.goal.id);
        window.localStorage.removeItem(storageKeys.draft);
        router.push(`/goals/${response.data.goal.id}`);
        return;
      }
      setDraft(response.data.draft);
      setClarification(response.data.clarificationQuestion);
      setMessage("");
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError(reason instanceof ApiClientError ? reason : new ApiClientError("GoalGuard could not read this goal.", "INTERNAL_ERROR", true));
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6" aria-labelledby="goal-heading" aria-busy={loading}>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-soft)]">Start with what matters</p>
        <h2 id="goal-heading" className="font-display text-3xl text-[var(--foreground)] sm:text-4xl">What are you protecting?</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--foreground-soft)]">Speak naturally. You can edit every constraint before GoalGuard checks a live option.</p>
      </div>

      <fieldset><legend className="mb-2 text-sm font-semibold text-[var(--foreground)]">Choose a purpose</legend><div className="flex flex-wrap gap-2">
        {categories.map((item) => { const CategoryIcon = item.icon; return (
          <button
            type="button"
            key={item.value}
            aria-pressed={category === item.value}
            onClick={() => { setCategory(item.value); setError(null); }}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-[background-color,border-color,color,transform] duration-[var(--duration-fast)] active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] ${category === item.value ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--surface)]" : "border-[var(--border)] bg-transparent text-[var(--foreground-soft)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"}`}
          >
            <CategoryIcon className="size-4" weight={category === item.value ? "fill" : "regular"} aria-hidden="true" />{item.label}
          </button>
        ); })}
      </div></fieldset>

      {clarification ? <Alert title="One detail needed" tone="warning">{clarification}</Alert> : null}

      <label className="block" htmlFor="goal-message">
        <span className="mb-2 block text-sm font-semibold text-[var(--foreground)]">{clarification ?? "Describe your protection goal"}</span>
        <textarea
          id="goal-message"
          value={message}
          onChange={(event) => { setMessage(event.target.value); setError(null); }}
          maxLength={4000}
          rows={5}
          aria-invalid={Boolean(error?.fieldErrors.message)}
          aria-describedby={error ? "goal-input-error" : undefined}
          placeholder={clarification ? "Add the missing detail…" : "I have $1,200 in ETH for rent next month, and I can’t afford to lose more than 5%."}
          className="field-control min-h-36 resize-none px-5 py-4 leading-7"
        />
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-[var(--foreground-soft)]">Creating a goal does not connect your wallet or prepare a transaction.</p>
        <Button type="submit" disabled={loading}>
          {loading ? "Reading your goal…" : clarification ? "Continue" : "Create protection goal"}<ArrowRight aria-hidden="true" />
        </Button>
      </div>
      {error ? (
        <Alert id="goal-input-error" title={error.code === "GONKA_UNAVAILABLE" ? "AI review unavailable" : "Goal not created"} tone="error">
          {error.message}{error.requestId ? <span className="mt-1 block text-xs tabular-nums">Request {error.requestId}</span> : null}
        </Alert>
      ) : null}
    </form>
  );
}
