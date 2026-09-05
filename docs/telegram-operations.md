# Telegram companion operations

GoalGuard Telegram V1 is an optional notification companion for goals created in the GoalGuard website. It
does not create or edit goals, call Gonka, request a wallet signature, broadcast a transaction, or create a
protected position. The website session remains authoritative.

## Provision a test bot

1. Open Telegram and start a conversation with [BotFather](https://t.me/BotFather).
2. Use `/newbot`, choose a display name, and choose a username ending in `bot`.
3. Store the token and exact username in a password manager or deployment secret store. Do not put either in
   `.env.example`, source files, screenshots, logs, or a public issue.
4. Deploy the database migration and the Next.js app over HTTPS before provisioning the webhook.

The setup script configures only the `message` update type and installs the V1 commands. It is deliberately
not part of `pnpm build`, `pnpm start`, database migrations, or worker startup.

## Configure Vercel and Render

Set these values in Vercel for the same-origin connection, link, and webhook routes:

- `TELEGRAM_NOTIFICATIONS_ENABLED=true`
- `TELEGRAM_BOT_USERNAME` (the exact BotFather username, without `@`)
- `TELEGRAM_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL` (the deployed HTTPS origin)
- `DATABASE_URL`

Set these values in the existing Render `goalguard-trade-monitor` worker:

- `TELEGRAM_NOTIFICATIONS_ENABLED=true`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `NEXT_PUBLIC_APP_URL`
- `DATABASE_URL`

Keep `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` server-only. The web process does not need the bot
token for linking or webhook processing; the worker does not need the webhook secret. Use the non-secret
defaults from `.env.example` for the TTL, reminder scan, and bounded notification batch.

Run the migration once from an explicitly configured development environment with the direct database URL:

```text
pnpm db:migrate
```

Do not run migrations from Vercel requests or Render startup.

## Provision and check the webhook

After the Vercel deployment is reachable:

```text
pnpm telegram:setup
pnpm telegram:check
```

The commands load `.env.local` for local use, call the Telegram Bot API, and print only safe status. Setup
validates the bot identity, configures:

```text
https://<your-app-origin>/api/integrations/telegram/webhook
```

with the webhook secret and `allowed_updates: ["message"]`, then installs `/start`, `/help`, `/status`,
`/goals`, `/alerts`, `/stop`, and `/unlink`. Check reports whether the configured webhook and update list
match. It exits non-zero when they do not.

Restart the existing Render worker after matching environment values are deployed. No second worker is
needed.

## Link and unlink behavior

The website creates a one-time, ten-minute deep link in memory. The user must open the private Telegram chat
and press Start; opening the link alone does not connect the account. The browser polls the status endpoint
only while that page is visible and the user is waiting for Start.

When Start succeeds, the connection is tied to the anonymous GoalGuard browser session that created the link.
Telegram IDs and chat IDs are never returned by the public web API. Relinking the same Telegram account from
another GoalGuard session transfers the account atomically and revokes the older mapping. A reused or expired
link cannot connect again.

Disconnecting from the website or using `/unlink` revokes the connection and cancels queued personalized
alerts. It does not change goals, council records, previews, or trade records. Blocking the bot stops future
delivery; unblock it in Telegram, disconnect the blocked mapping, and create a new website link to reconnect.

Preferences are independent switches for council results, unsigned preview readiness, preview expiry,
deadline reminders, and selected-option expiry. “Pause all” keeps the connection but disables every switch.
“Resume defaults” restores the documented defaults, with preview-expiry warnings remaining off.

## Delivery and incident response

The Render worker owns the notification outbox. It leases a bounded batch, re-checks connection state,
preference, and referenced goal/preview/council state immediately before sending, and records sanitized
delivery metadata. It sends sequentially and honors Telegram `retry_after` for rate limits.

- A successful send is marked sent with the Telegram message ID.
- A 429 returns the row to pending using Telegram’s validated retry delay.
- Temporary server, timeout, and network errors use bounded backoff and eventually fail safely.
- A 403 marks the connection blocked and cancels current personalized work.
- Stale, expired, revoked, paused, or superseded work is cancelled or suppressed before sending.

If Telegram delivery is degraded, first run `pnpm telegram:check`, inspect the Render worker health, and
verify that Vercel and Render use the same database and bot username. Do not copy bot tokens, webhook
secrets, raw webhook bodies, Telegram IDs, or deep-link tokens into incident tickets.

To rotate a webhook secret, generate a new secret in the deployment secret stores, deploy the matching Vercel
value, then run `pnpm telegram:setup` again. Keep the Render worker token unchanged unless the BotFather bot
token itself was revoked. If the bot token is compromised, revoke it with BotFather, replace it in Render,
run setup with the new token, and restart the worker.

To disable the companion, set `TELEGRAM_NOTIFICATIONS_ENABLED=false` in both Vercel and Render and redeploy.
The core website and trade-monitor duties continue; queued Telegram work is not sent while disabled. Existing
connections remain stored for operational continuity, and users can disconnect them from the website after
the feature is re-enabled.

## Manual smoke flow

Use a test bot and development database first:

1. Start with Telegram disabled and confirm the website shows an honest unavailable state.
2. Enable both deployments, run setup and check, and restart the worker.
3. Create a goal in a fresh browser session, open the website CTA, and press Start in a private Telegram chat.
4. Confirm the website shows connected and Telegram sends the connection receipt with the no-credentials warning.
5. Exercise `/status`, `/goals`, `/alerts`, `/stop`, `/help`, an unknown message, and `/unlink`.
6. Verify approved, disputed, and blocked council notifications, unsigned preview readiness, and reminder
   deduplication using test records and injected clocks.
7. Confirm no message suggests signing, broadcasting, funding, or an executed position.
