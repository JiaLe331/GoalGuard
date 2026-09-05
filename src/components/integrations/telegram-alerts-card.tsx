"use client";

import { ArrowClockwise, ArrowSquareOut, Bell, CheckCircle, LinkBreak, PauseCircle, PlayCircle, TelegramLogo, WarningCircle } from "@phosphor-icons/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import type { TelegramPublicConnectionStatus, TelegramPublicPreferences } from "@/lib/contracts";
import { ApiClientError, goalGuardApi } from "@/lib/frontend/api-client";
import { formatDate } from "@/lib/frontend/format";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";

const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_WINDOW_MS = 10 * 60 * 1_000;
const MAX_TIMER_DELAY_MS = 2_147_000_000;

export const DEFAULT_TELEGRAM_PREFERENCES: TelegramPublicPreferences = {
  councilResults: true,
  previewReady: true,
  previewExpiring: false,
  goalDeadlines: true,
  optionExpiry: true,
};

type LinkState = "idle" | "loading" | "ready" | "pending" | "expired" | "error";
type LinkData = { deepLink: string; expiresAt: string };
type ActionState = "pause" | "resume" | "disconnect" | keyof TelegramPublicPreferences | null;

const preferenceItems: Array<{ key: keyof TelegramPublicPreferences; label: string; description: string }> = [
  { key: "councilResults", label: "Council results", description: "When the three checks finish." },
  { key: "previewReady", label: "Unsigned preview ready", description: "When a demo preview is generated." },
  { key: "previewExpiring", label: "Preview expiry", description: "Before an unsigned preview expires." },
  { key: "goalDeadlines", label: "Goal deadlines", description: "Seven days and one day before a deadline." },
  { key: "optionExpiry", label: "Selected-option expiry", description: "When the selected option expires soon." },
];

function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function statusTone(status: TelegramPublicConnectionStatus["status"], linkState: LinkState): StatusTone {
  if (status === "connected") return "ready";
  if (status === "paused" || linkState === "expired" || linkState === "error") return "warning";
  if (status === "blocked") return "error";
  if (linkState === "pending") return "info";
  return "neutral";
}

function statusLabel(status: TelegramPublicConnectionStatus["status"], linkState: LinkState) {
  if (status === "connected") return "Connected";
  if (status === "paused") return "Paused";
  if (status === "blocked") return "Bot blocked";
  if (status === "unavailable") return "Unavailable";
  if (linkState === "pending") return "Waiting for Start";
  if (linkState === "expired") return "Link expired";
  return "Not connected";
}

function allOff(preferences: TelegramPublicPreferences) {
  return Object.values(preferences).every((value) => !value);
}

function PreferenceSwitch({
  id,
  item,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  item: (typeof preferenceItems)[number];
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] px-2 py-1.5 transition-colors hover:bg-[var(--surface-hover)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-[var(--focus-ring)]">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="size-5 shrink-0 accent-[var(--accent)]"
        aria-describedby={`${id}-description`}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[color:var(--foreground)]">{item.label}</span>
        <span id={`${id}-description`} className="mt-0.5 block text-xs leading-5 text-[color:var(--foreground-soft)]">{item.description}</span>
      </span>
      <span className="sr-only">{checked ? "On" : "Off"}</span>
    </label>
  );
}

function DisconnectControl({
  titleId,
  confirming,
  busy,
  startLabel = "Disconnect Telegram",
  onStart,
  onCancel,
  onConfirm,
}: {
  titleId: string;
  confirming: boolean;
  busy: boolean;
  startLabel?: string;
  onStart: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!confirming) {
    return (
      <Button variant="ghost" className="min-h-11 w-full px-3 text-xs" onClick={onStart} disabled={busy}>
        <CheckCircle className="size-4" aria-hidden="true" />{startLabel}
      </Button>
    );
  }

  return (
    <div role="alertdialog" aria-labelledby={titleId} className="rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--surface-raised)] p-3">
      <p id={titleId} className="text-xs font-semibold">Disconnect Telegram alerts?</p>
      <p className="mt-1 text-xs leading-5 text-[color:var(--foreground-soft)]">Queued personalized alerts will be cancelled. Your GoalGuard goals stay unchanged.</p>
      <div className="mt-3 flex gap-2">
        <Button variant="ghost" className="min-h-11 flex-1 px-2 text-xs" onClick={onCancel} disabled={busy}>Keep connected</Button>
        <Button variant="primary" className="min-h-11 flex-1 px-2 text-xs" onClick={onConfirm} disabled={busy}>
          <LinkBreak className="size-4" aria-hidden="true" />{busy ? "Disconnecting…" : "Disconnect"}
        </Button>
      </div>
    </div>
  );
}

export function TelegramAlertsCard() {
  const titleId = useId();
  const disconnectTitleId = useId();
  const [status, setStatus] = useState<TelegramPublicConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<LinkData | null>(null);
  const [linkState, setLinkState] = useState<LinkState>("idle");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [pendingStartedAt, setPendingStartedAt] = useState<number | null>(null);
  const [action, setAction] = useState<ActionState>(null);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const linkAbort = useRef<AbortController | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal, silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const response = await goalGuardApi.getTelegramConnection(signal);
      setStatus(response.data);
      setError(null);
      if (response.data.status !== "disconnected") {
        setLink(null);
        setLinkState("idle");
        setPendingStartedAt(null);
      }
      return response.data;
    } catch (reason) {
      if (isAbortError(reason)) return null;
      setError(errorMessage(reason, "Telegram alert status is unavailable."));
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => { void refresh(controller.signal); }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [refresh]);

  const requestLink = useCallback(async () => {
    linkAbort.current?.abort();
    const controller = new AbortController();
    linkAbort.current = controller;
    setLinkState("loading");
    setLinkError(null);
    try {
      const response = await goalGuardApi.createTelegramLink({ timezone: browserTimezone() }, controller.signal);
      setLink(response.data);
      setLinkState("ready");
      setPendingStartedAt(null);
    } catch (reason) {
      if (isAbortError(reason)) return;
      setLink(null);
      setLinkState("error");
      setLinkError(errorMessage(reason, "GoalGuard could not prepare a Telegram link."));
    }
  }, []);

  useEffect(() => () => linkAbort.current?.abort(), []);

  useEffect(() => {
    if (status?.status !== "disconnected" || linkState !== "idle") return;
    const timer = window.setTimeout(() => { void requestLink(); }, 0);
    return () => window.clearTimeout(timer);
  }, [linkState, requestLink, status?.status]);

  const expireLink = useCallback(() => {
    setLink(null);
    setLinkState("expired");
    setPendingStartedAt(null);
  }, []);

  useEffect(() => {
    if (!link || (linkState !== "ready" && linkState !== "pending")) return;
    const expiresAt = Date.parse(link.expiresAt);
    const timer = window.setTimeout(expireLink, Number.isFinite(expiresAt) ? Math.min(MAX_TIMER_DELAY_MS, Math.max(0, expiresAt - Date.now())) : 0);
    return () => window.clearTimeout(timer);
  }, [expireLink, link, linkState]);

  useEffect(() => {
    if (status?.status !== "disconnected" || linkState !== "pending" || !link || pendingStartedAt === null) return;
    const controller = new AbortController();
    const linkExpiry = Date.parse(link.expiresAt);
    const stopAt = Math.min(pendingStartedAt + MAX_POLL_WINDOW_MS, linkExpiry);
    let stopped = false;

    const poll = async () => {
      if (stopped || document.visibilityState !== "visible") return;
      if (!Number.isFinite(stopAt) || Date.now() >= stopAt) {
        expireLink();
        return;
      }
      await refresh(controller.signal, true);
    };

    const timer = window.setInterval(() => { void poll(); }, POLL_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stopped = true;
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [expireLink, link, linkState, pendingStartedAt, refresh, status?.status]);

  const updatePreferences = useCallback(async (preferences: TelegramPublicPreferences, nextAction: Exclude<ActionState, "disconnect" | null>) => {
    setAction(nextAction);
    setError(null);
    try {
      const response = await goalGuardApi.updateTelegramPreferences(preferences);
      setStatus(response.data);
    } catch (reason) {
      setError(errorMessage(reason, "GoalGuard could not update Telegram alerts."));
    } finally {
      setAction(null);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    setAction("disconnect");
    setError(null);
    try {
      const response = await goalGuardApi.disconnectTelegram();
      setStatus(response.data);
      setLink(null);
      setLinkState("idle");
      setPendingStartedAt(null);
      setLinkError(null);
      setConfirmingDisconnect(false);
    } catch (reason) {
      setError(errorMessage(reason, "GoalGuard could not disconnect Telegram."));
    } finally {
      setAction(null);
    }
  }, []);

  if (loading && !status) {
    return (
      <section aria-labelledby={titleId} aria-busy="true" className="rounded-[var(--radius-card)] bg-[var(--surface-subtle)] p-4">
        <div className="flex items-start gap-3">
          <div className="size-10 animate-pulse rounded-full bg-[var(--surface-hover)] motion-reduce:animate-none" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-32 animate-pulse rounded-full bg-[var(--surface-hover)] motion-reduce:animate-none" />
            <div className="h-3 w-full animate-pulse rounded-full bg-[var(--surface-hover)] motion-reduce:animate-none" />
          </div>
        </div>
        <h2 id={titleId} className="sr-only">Telegram alerts</h2>
      </section>
    );
  }

  if (!status) {
    return (
      <section aria-labelledby={titleId} className="rounded-[var(--radius-card)] bg-[var(--surface-subtle)] p-4">
        <div className="flex items-start gap-3">
          <WarningCircle className="mt-0.5 size-5 shrink-0 text-[color:var(--negative)]" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-semibold tracking-[-0.02em]">Telegram alerts</h2>
            <p className="mt-1 text-sm leading-5 text-[color:var(--foreground-soft)]">{error ?? "Telegram alert status is unavailable."}</p>
            <Button variant="secondary" className="mt-3 min-h-11 px-3 text-xs" onClick={() => { void refresh(); }}>Retry</Button>
          </div>
        </div>
      </section>
    );
  }

  const pending = status.status === "disconnected" && linkState === "pending";
  const statusToneValue = statusTone(status.status, linkState);

  return (
    <section aria-labelledby={titleId} className="rounded-[var(--radius-card)] bg-[var(--surface-subtle)] p-4 text-[color:var(--foreground)]">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[color:var(--accent-foreground)]">
          <TelegramLogo className="size-5" weight="fill" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">Companion</p>
              <h2 id={titleId} className="mt-1 font-semibold tracking-[-0.02em]">Telegram alerts</h2>
            </div>
            <StatusBadge label={pending ? "Waiting" : statusLabel(status.status, linkState)} tone={statusToneValue} />
          </div>
        </div>
      </div>

      {error ? <Alert className="mt-4 p-3 text-xs leading-5" tone="error" title="Telegram update failed"><p>{error}</p></Alert> : null}

      {status.status === "unavailable" ? (
        <div className="mt-4 flex items-start gap-2 text-sm leading-5 text-[color:var(--foreground-soft)]">
          <Bell className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>Telegram alerts are not available right now. Your GoalGuard workflow is unaffected.</p>
        </div>
      ) : status.status === "blocked" ? (
        <div className="mt-4">
          <Alert className="p-3 text-xs leading-5" tone="warning" title="Telegram bot blocked">
            <p>Unblock the GoalGuard bot in Telegram, then disconnect and connect it again here.</p>
          </Alert>
          <div className="mt-3">
            <DisconnectControl titleId={disconnectTitleId} confirming={confirmingDisconnect} busy={action !== null} startLabel="Disconnect to reconnect" onStart={() => setConfirmingDisconnect(true)} onCancel={() => setConfirmingDisconnect(false)} onConfirm={() => { void handleDisconnect(); }} />
          </div>
        </div>
      ) : status.status === "disconnected" ? (
        <div className="mt-4">
          {pending ? (
            <>
              <p className="text-sm leading-5 text-[color:var(--foreground-soft)]" role="status" aria-live="polite">Finish by pressing Start in Telegram.</p>
              {link ? (
                <a
                  href={link.deepLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--button-primary-bg)] px-4 text-center text-xs font-semibold text-[color:var(--button-primary-fg)] transition-[background-color,transform] duration-[var(--duration-press)] hover:bg-[var(--button-primary-hover)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                  onClick={(event) => {
                    if (Date.parse(link.expiresAt) <= Date.now()) {
                      event.preventDefault();
                      expireLink();
                      return;
                    }
                  }}
                >
                  Open Telegram again <ArrowSquareOut className="size-4" aria-hidden="true" />
                </a>
              ) : null}
              {link ? <p className="mt-2 text-xs leading-5 text-[color:var(--foreground-soft)]">Link expires {formatDate(link.expiresAt, { hour: "numeric", minute: "2-digit" })}.</p> : null}
            </>
          ) : linkState === "loading" ? (
            <p className="text-sm leading-5 text-[color:var(--foreground-soft)]" role="status" aria-live="polite">Preparing a secure Telegram link…</p>
          ) : linkState === "ready" && link ? (
            <>
              <p className="text-sm leading-5 text-[color:var(--foreground-soft)]">Get council results and deadline reminders. One-time setup; Telegram will ask you to press Start.</p>
              <a
                href={link.deepLink}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--button-primary-bg)] px-4 text-center text-xs font-semibold text-[color:var(--button-primary-fg)] transition-[background-color,transform] duration-[var(--duration-press)] hover:bg-[var(--button-primary-hover)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                onClick={(event) => {
                  if (Date.parse(link.expiresAt) <= Date.now()) {
                    event.preventDefault();
                    expireLink();
                    return;
                  }
                  setPendingStartedAt(Date.now());
                  setLinkState("pending");
                }}
              >
                Get Telegram updates <ArrowSquareOut className="size-4" aria-hidden="true" />
              </a>
              <p className="mt-2 text-xs leading-5 text-[color:var(--foreground-soft)]">Link expires {formatDate(link.expiresAt, { hour: "numeric", minute: "2-digit" })}.</p>
            </>
          ) : (
            <>
              <p className="text-sm leading-5 text-[color:var(--foreground-soft)]">Get council results and deadline reminders. One-time setup; Telegram will ask you to press Start.</p>
              {linkError ? <p className="mt-3 text-xs leading-5 text-[color:var(--negative)]" role="alert">{linkError}</p> : null}
              {linkState === "expired" ? <p className="mt-3 text-xs leading-5 text-[color:var(--warning)]" role="status">This link expired before Telegram was connected.</p> : null}
              <Button variant="secondary" className="mt-3 min-h-11 w-full px-3 text-xs" onClick={() => { void requestLink(); }}>
                {linkState === "expired" ? <ArrowClockwise className="size-4" aria-hidden="true" /> : null}
                {linkState === "expired" ? "Generate a new link" : "Retry Telegram link"}
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm leading-5 text-[color:var(--foreground-soft)]">
            {status.status === "paused" ? <><span className="font-semibold text-[color:var(--foreground)]">Telegram alerts paused.</span> Telegram stays connected, but every alert is paused.</> : <><span className="font-semibold text-[color:var(--foreground)]">Telegram alerts connected.</span> Choose which GoalGuard lifecycle updates Telegram should send.</>}
          </p>

          <fieldset className="mt-3 space-y-1" disabled={action !== null}>
            <legend className="sr-only">Telegram alert preferences</legend>
            {preferenceItems.map((item) => {
              const id = `${titleId}-${item.key}`;
              return <PreferenceSwitch key={item.key} id={id} item={item} checked={status.preferences[item.key]} disabled={action !== null} onChange={() => {
                if (status.status !== "connected" && status.status !== "paused") return;
                void updatePreferences({ ...status.preferences, [item.key]: !status.preferences[item.key] }, item.key);
              }} />;
            })}
          </fieldset>

          <div className="mt-3 grid gap-2">
            {status.status === "paused" ? (
              <Button variant="secondary" className="min-h-11 w-full px-3 text-xs" onClick={() => { void updatePreferences(DEFAULT_TELEGRAM_PREFERENCES, "resume"); }} disabled={action !== null}>
                <PlayCircle className="size-4" aria-hidden="true" />{action === "resume" ? "Resuming…" : "Resume defaults"}
              </Button>
            ) : (
              <Button variant="secondary" className="min-h-11 w-full px-3 text-xs" onClick={() => { void updatePreferences({ councilResults: false, previewReady: false, previewExpiring: false, goalDeadlines: false, optionExpiry: false }, "pause"); }} disabled={action !== null || allOff(status.preferences)}>
                <PauseCircle className="size-4" aria-hidden="true" />{action === "pause" ? "Pausing…" : "Pause all"}
              </Button>
            )}

            <DisconnectControl titleId={disconnectTitleId} confirming={confirmingDisconnect} busy={action !== null} onStart={() => setConfirmingDisconnect(true)} onCancel={() => setConfirmingDisconnect(false)} onConfirm={() => { void handleDisconnect(); }} />
          </div>
        </div>
      )}
    </section>
  );
}
