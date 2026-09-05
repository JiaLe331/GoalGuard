"use client";

import { Bell, CheckCircle, LinkBreak, PauseCircle, PlayCircle, TelegramLogo, WarningCircle } from "@phosphor-icons/react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";

const states: Array<{
  label: string;
  badge: string;
  tone: StatusTone;
  icon: typeof TelegramLogo;
  content: "unavailable" | "disconnected" | "pending" | "preferences" | "paused" | "blocked";
}> = [
  { label: "Unavailable", badge: "Unavailable", tone: "neutral", icon: Bell, content: "unavailable" },
  { label: "Disconnected", badge: "Not connected", tone: "neutral", icon: TelegramLogo, content: "disconnected" },
  { label: "Pending", badge: "Waiting for Start", tone: "info", icon: TelegramLogo, content: "pending" },
  { label: "Connected", badge: "Connected", tone: "ready", icon: CheckCircle, content: "preferences" },
  { label: "Paused", badge: "Paused", tone: "warning", icon: PauseCircle, content: "paused" },
  { label: "Blocked", badge: "Bot blocked", tone: "error", icon: WarningCircle, content: "blocked" },
];

function SampleAction({ children, icon: Icon = TelegramLogo }: { children: string; icon?: typeof TelegramLogo }) {
  return <Button variant="secondary" className="mt-3 min-h-11 w-full px-3 text-xs" disabled><Icon className="size-4" aria-hidden="true" />{children}</Button>;
}

function SamplePreferences({ paused = false }: { paused?: boolean }) {
  const items = [
    ["Council results", !paused],
    ["Unsigned preview ready", !paused],
    ["Preview expiry", false],
    ["Goal deadlines", !paused],
    ["Selected-option expiry", !paused],
  ] as const;
  return (
    <div className="mt-3 space-y-1" aria-label="Sample Telegram alert preferences">
      {items.map(([label, checked]) => (
        <div key={label} className="flex min-h-9 items-center gap-2 rounded-[var(--radius-control)] px-2 text-xs">
          <span className={`grid size-4 place-items-center rounded border ${checked ? "border-[var(--positive)] bg-[var(--positive-surface)] text-[color:var(--positive)]" : "border-[var(--border-strong)]"}`} aria-hidden="true">{checked ? "✓" : ""}</span>
          <span>{label}</span>
          <span className="sr-only">{checked ? "On" : "Off"}</span>
        </div>
      ))}
    </div>
  );
}

function SampleContent({ state }: { state: (typeof states)[number]["content"] }) {
  if (state === "unavailable") {
    return <div className="mt-4 flex items-start gap-2 text-sm leading-5 text-[color:var(--foreground-soft)]"><Bell className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><p>Telegram alerts are not available right now. Your GoalGuard workflow is unaffected.</p></div>;
  }
  if (state === "disconnected") {
    return <div className="mt-4"><p className="text-sm leading-5 text-[color:var(--foreground-soft)]">Get council results and deadline reminders. One-time setup; Telegram will ask you to press Start.</p><SampleAction>Get Telegram updates</SampleAction></div>;
  }
  if (state === "pending") {
    return <div className="mt-4"><p className="text-sm leading-5 text-[color:var(--foreground-soft)]">Finish by pressing Start in Telegram.</p><SampleAction>Open Telegram again</SampleAction></div>;
  }
  if (state === "blocked") {
    return <div className="mt-4"><Alert className="p-3 text-xs leading-5" tone="warning" title="Telegram bot blocked"><p>Unblock the GoalGuard bot in Telegram, then disconnect and connect it again here.</p></Alert><SampleAction icon={LinkBreak}>Disconnect to reconnect</SampleAction></div>;
  }
  if (state === "paused") {
    return <div className="mt-4"><p className="text-sm leading-5 text-[color:var(--foreground-soft)]">Telegram stays connected, but every alert is paused.</p><SamplePreferences paused /><SampleAction icon={PlayCircle}>Resume defaults</SampleAction></div>;
  }
  return <div className="mt-4"><p className="text-sm leading-5 text-[color:var(--foreground-soft)]">Choose which GoalGuard lifecycle updates Telegram should send.</p><SamplePreferences /><SampleAction icon={PauseCircle}>Pause all</SampleAction></div>;
}

export function TelegramAlertsPreview() {
  return (
    <section aria-labelledby="telegram-preview-title">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="section-eyebrow">Telegram companion</p>
          <h2 id="telegram-preview-title" className="mt-2 text-3xl font-semibold tracking-[-0.05em]">Canonical alert states</h2>
        </div>
        <p className="hidden text-xs text-[color:var(--foreground-soft)] sm:block">Static sample · no API calls</p>
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--foreground-soft)]">These six states exercise the connection card without production fallbacks, credentials, storage, or Telegram traffic.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {states.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="rounded-[var(--radius-card)] bg-[var(--surface-subtle)] p-4" aria-label={`Telegram alerts ${item.label.toLowerCase()} state`}>
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[color:var(--accent-foreground)]"><Icon className="size-4" aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2"><h3 className="font-semibold tracking-[-0.02em]">Telegram alerts</h3><StatusBadge label={item.badge} tone={item.tone} /></div>
                  <p className="mt-1 text-xs uppercase tracking-[0.1em] text-[color:var(--foreground-muted)]">{item.label} sample</p>
                </div>
              </div>
              <SampleContent state={item.content} />
            </article>
          );
        })}
      </div>
    </section>
  );
}
