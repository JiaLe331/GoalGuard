"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const categories = ["Rent", "Tuition", "Travel", "Emergency fund", "Something else"] as const;
const storageKey = "goalguard:goal-draft";

export function GoalComposer() {
  const [category, setCategory] = useState<(typeof categories)[number] | null>(null);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const draft = JSON.parse(saved) as { category?: string; message?: string };
      queueMicrotask(() => {
        if (categories.includes(draft.category as (typeof categories)[number])) {
          setCategory(draft.category as (typeof categories)[number]);
        }
        if (typeof draft.message === "string") setMessage(draft.message);
      });
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  function saveDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) {
      setNotice("Describe the money and deadline you want to protect first.");
      return;
    }
    window.localStorage.setItem(storageKey, JSON.stringify({ category, message: message.trim() }));
    setNotice("Draft saved only in this browser. No recommendation or trade was created.");
  }

  return (
    <form onSubmit={saveDraft} className="space-y-6" aria-labelledby="goal-heading">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#91a398]">Start with what matters</p>
        <h2 id="goal-heading" className="text-2xl font-semibold tracking-[-0.02em] text-white">What are you protecting?</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#a7b6ac]">Speak naturally. GoalGuard will eventually turn this into clear constraints before looking at any option.</p>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Goal category">
        {categories.map((item) => (
          <button
            type="button"
            key={item}
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
            className={`rounded-full border px-3.5 py-2 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cbff6b] ${category === item ? "border-[#cbff6b]/50 bg-[#cbff6b]/12 text-[#e7ffc3]" : "border-white/10 bg-white/[0.035] text-[#aebcb2] hover:bg-white/[0.07] hover:text-white"}`}
          >
            {item}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="sr-only">Describe your protection goal</span>
        <textarea
          value={message}
          onChange={(event) => { setMessage(event.target.value); setNotice(null); }}
          maxLength={4000}
          rows={5}
          placeholder="I have $1,200 in ETH for rent next month, and I can’t afford to lose more than 5%."
          className="w-full resize-none rounded-[1.3rem] border border-white/10 bg-[#0d1711]/70 px-5 py-4 text-base leading-7 text-white outline-none placeholder:text-[#617168] focus:border-[#cbff6b]/45 focus:ring-4 focus:ring-[#cbff6b]/5"
        />
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-[#819087]">M1 stores this draft locally. AI goal parsing arrives in the next milestone.</p>
        <Button type="submit">Save local draft <span aria-hidden="true">→</span></Button>
      </div>
      {notice ? <p className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-[#c4d1c8]" role="status">{notice}</p> : null}
    </form>
  );
}
