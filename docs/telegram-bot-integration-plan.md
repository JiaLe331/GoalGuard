# GoalGuard Telegram Companion V1 — Implementation Plan

Status: implementation not started

Feature class: P2 optional monitoring/reminders; it must not change the P0 demo-only trade boundary

Target branch: `feat/telegram-companion`

Last reviewed: 2026-09-05

## 1. Authority and handoff contract

This document is the source of truth for the first GoalGuard Telegram integration. An agent implementing
the feature must read this file completely before editing code.

Instruction precedence is:

1. `AGENTS.md`.
2. `goalguard_prd.md`, especially Sections 11, 16, and 17.
3. `DESIGN_SYSTEM.md` for web UI and interaction decisions.
4. This plan for the Telegram feature's frozen scope, architecture, messages, tasks, and acceptance tests.

If this plan conflicts with a product, safety, financial, privacy, or contract requirement in the PRD,
the PRD wins. Update the PRD as the first implementation commit to add the Telegram contracts and lifecycle;
do not silently reinterpret the existing contracts.

The implementation must use exactly **one branch**. Do not create a branch per task and do not switch
branches between commits.

```bash
git status --short --branch
git switch main
git pull --ff-only
git switch -c feat/telegram-companion
```

If `main` is not the approved integration base, replace `main` with the maintainer-approved base before
creating the branch. If the working tree contains unrelated changes, stop and preserve them; do not stash,
discard, or overwrite them without the owner's direction. Once created, remain on
`feat/telegram-companion` until the feature is complete.

## 2. Product decision

Telegram V1 is an **optional notification companion for goals created on the GoalGuard website**.

```text
GoalGuard website creates and owns the goal
        -> user links Telegram once and presses Telegram's Start button
        -> web workflow remains authoritative
        -> Telegram reports important lifecycle changes and reminders
        -> Telegram never builds, approves, signs, submits, or executes a trade
```

Users cannot create or edit goals through Telegram in V1. Free-form Telegram text is not sent to Gonka or
any other model. Telegram does not become a second trading interface.

The connection is one-time for the current anonymous GoalGuard browser session. It remains active for goals
owned by that session until the user unlinks it, blocks the bot, or transfers the Telegram account to a
different GoalGuard session. Clearing/expiring the browser cookie cannot notify the server and therefore does
not revoke the existing Telegram connection; it only means goals created under the new browser session are
not included until the user reconnects and transfers the bot link.

Telegram requires the user to open the bot and press **Start** before the bot can contact that private chat.
The web UI should minimize friction, but must not pretend this consent step can be removed.

## 3. Goals and success criteria

V1 succeeds when a user can:

1. Start a goal on the GoalGuard website.
2. Open one GoalGuard-generated Telegram deep link and press Start once.
3. See “Telegram alerts connected” in the web workspace without entering a Telegram username or code.
4. Receive a concise message when council review completes.
5. Receive a truthful receipt when an unsigned preview is generated.
6. Receive enabled goal-deadline, selected-option-expiry, and preview-expiry reminders.
7. Inspect recent status and control notifications with bot commands.
8. Pause or unlink at any time.

The integration is optional. If Telegram is disabled or unavailable, the GoalGuard website, council,
candidate generation, preview generation, and existing Render trade-monitor work must continue normally.

## 4. Non-goals and hard safety boundaries

V1 must not:

- create, parse, or edit a goal from a Telegram message;
- accept free-form financial instructions in Telegram;
- request or store a seed phrase, private key, signature, wallet credential, or Telegram phone number;
- request token approval, sign a transaction, submit calldata, broadcast, or execute a trade;
- expose wallet addresses, raw calldata, raw protocol payloads, Gonka raw output, chain-of-thought, API keys,
  webhook secrets, or one-time link tokens in Telegram messages or logs;
- describe a previewed trade as executed, active, confirmed, or protected;
- say “your option” when the product only selected an option for a demo plan;
- add price speculation, trading signals, portfolio advice, or frequent ETH price alerts;
- make Telegram availability a prerequisite for the web happy path;
- use a Telegram deep link as cross-device authentication for GoalGuard;
- add a Telegram Mini App, Telegram Login Widget, group chat support, channels, inline mode, or goal sharing;
- use test fixtures or invented financial data in production messages.

`ENABLE_LIVE_THETANUTS_EXECUTION` remains `false`. The happy path still ends at
**Protection Plan Ready (Demo)**, with no signature, broadcast, funds moved, or protected position.

## 5. Current repository facts

The implementation should build on, not duplicate, the current architecture:

- Next.js 16.3.3 App Router and Node.js 22.
- Thin route handlers under `src/app/api`; validated domain/integration code under `src/lib`.
- Strict Zod contracts in `src/lib/contracts`.
- Supabase PostgreSQL through Drizzle; generated migrations under `drizzle`.
- Anonymous ownership through the `goalguard_session` HttpOnly cookie. Only its SHA-256
  `owner_session_hash` is persisted.
- `goals` already contains status and deadline.
- `protection_candidates` already contains selected status and option expiry.
- `council_decisions` already contains the three-review result.
- `trades` already contains `previewed` status and `preview_expires_at`.
- The existing Render process `src/worker/trade-monitor.ts` already polls continuously and must also deliver
  Telegram work. Do not create a second Render service or a second continuously running process for V1.
- `/goals/[goalId]` is ownership-scoped. A link opened from a different browser/device correctly returns a
  safe “not available in this browser” state.

The existing database therefore contains the facts needed to compose alerts, but it does not contain a
Telegram identity link, preferences, webhook deduplication, or a reliable delivery outbox. Those are added
by this feature.

## 6. Frozen user experience

### 6.1 Web connection flow

Add a compact `TelegramAlertsCard` to the existing `GoalRail`, so it appears in the desktop rail and the
existing mobile drawer. Do not add a mandatory step to the five-stage protection workflow.

Disconnected state:

- Heading: “Telegram alerts”.
- Copy: “Get council results and deadline reminders. One-time setup; Telegram will ask you to press Start.”
- CTA: “Get Telegram updates”.

To preserve a genuine single-click web action, the component may request a short-lived deep link in advance
while the disconnected card is visible. The CTA must be an ordinary `https://t.me/...` link opened by the
user; the actual Telegram Start press remains required consent. Never place the one-time token in HTML sent
by a cached/static page.

Pending state:

- Copy: “Finish by pressing Start in Telegram.”
- Poll the connection-status endpoint every three seconds while the original page remains visible, stopping
  when connected, when the link expires, or after ten minutes.
- Provide “Generate a new link” after expiry.

Connected state:

- Status: “Telegram alerts connected”.
- Show notification toggles without exposing Telegram user ID or chat ID.
- Actions: “Pause all” and “Disconnect”.
- Reuse the design system's cards, status badges, controls, focus states, and reduced-motion behavior.

Paused state is derived when every preference is off. Show “Telegram alerts paused” and a “Resume defaults”
action. Pausing retains the connection; disconnecting revokes it.

Blocked state:

- Show “Telegram bot blocked” with instructions to unblock the bot in Telegram and reconnect.
- Do not automatically send or repeatedly retry while blocked.

Unconfigured state:

- Do not show a broken CTA.
- Show a quiet “Telegram alerts are not available” state in development/preview surfaces.
- Never block or degrade the core GoalGuard workflow.

### 6.2 Cross-device behavior

Telegram knows which chat is linked to an `owner_session_hash`; it does not replace GoalGuard's browser
ownership model. Message buttons may link to `${NEXT_PUBLIC_APP_URL}/goals/{goalId}`, but they do not grant
access. If opened in a browser without the linked GoalGuard session cookie, existing ownership checks must
continue to return the safe not-found state.

Do not add magic-login links, store the raw GoalGuard session cookie, transfer goal ownership, or create
session aliases in V1. Messages must carry enough safe summary information to remain useful without opening
the website. Where appropriate, say “Open this in the browser where you created the goal.”

### 6.3 Supported bot commands

Only private chats are supported. Normalize `/command@BotUsername` to `/command`; ignore casing for the
command name but not for token data.

| Command | Behavior |
|---|---|
| `/start <token>` | Consume a single-use web link, connect the private chat, and send the connection receipt. |
| `/start` | Explain that goals are created on the GoalGuard website and provide a safe website URL. |
| `/status` | Show the latest goal's high-level canonical state. Do not generate or refresh anything. |
| `/goals` | Show at most five most-recent goals for the linked session: label, deadline, and status only. |
| `/alerts` | Show current preferences and the exact commands for changing them. |
| `/alerts council on\|off` | Toggle council-result messages. |
| `/alerts preview on\|off` | Toggle unsigned-preview-ready receipts. |
| `/alerts preview-expiry on\|off` | Toggle preview-expiry reminders. |
| `/alerts deadline on\|off` | Toggle goal-deadline reminders. |
| `/alerts option-expiry on\|off` | Toggle selected-option-expiry reminders. |
| `/stop` | Turn every optional preference off but keep the account linked. |
| `/unlink` | Revoke the connection and cancel unsent personalized deliveries. |
| `/help` | Explain the supported commands and the demo-only boundary. |

Unknown commands and free-form messages receive the help response. They must not be forwarded to an LLM.
Unlinked chats may use `/start` and `/help`; other commands reply with instructions to connect from the web
app.

Command replies are operational responses, not optional lifecycle notifications, so preference toggles do
not suppress them. `/unlink` must enqueue one final non-personal confirmation in the same transaction that
revokes the connection; that confirmation may be delivered after revocation but must contain no goal data.

## 7. Notification catalog and exact semantics

All message bodies are produced by deterministic application code from validated persisted facts. Use plain
text rather than Telegram Markdown/HTML in V1, eliminating escaping ambiguity. Inline keyboards may contain
only allowlisted HTTPS GoalGuard URLs.

Lifecycle messages include at most one URL button, always targeting the configured GoalGuard origin and the
referenced `/goals/{goalId}` page:

| Message | Button label |
|---|---|
| Council approved | “Review plan” |
| Council disputed/blocked | “View council record” |
| Unsigned preview ready | “View unsigned preview” |
| Preview expiring | “Generate a fresh preview” |
| Goal deadline | “Review goal” |
| Selected option expiry | “Review demo plan” |

These buttons carry no authentication or one-time Telegram token. The connection/help response may link only
to `${NEXT_PUBLIC_APP_URL}/goals/new`. Validate the final URL origin before it reaches the Bot API client.

### 7.1 Default preferences

| Preference | Default |
|---|---:|
| Council results | On |
| Unsigned preview ready | On |
| Preview expiring | Off |
| Goal deadline reminders | On |
| Selected option expiry reminder | On |

Preview-expiry alerts default off because the current unsigned preview is intentionally short-lived. The
feature exists for users who explicitly enable it, but must not produce noisy default behavior.

### 7.2 Connection receipt

Trigger: successful consumption of `/start <token>`.

```text
🛡 GoalGuard alerts connected

This Telegram account will receive enabled updates for goals created in your linked GoalGuard browser.

GoalGuard will never ask for your seed phrase, private key, or wallet signature here.
Use /status to see the latest plan or /alerts to manage notifications.
```

If the linked session already has a latest goal, append its safe current status. Do not enqueue historical
council/preview event messages merely because a connection was created.

### 7.3 Council result

Trigger: a new persisted `CouncilDecision`, regardless of `approved`, `disputed`, or `blocked`. It applies
only to decisions created after `linked_at`. A reused decision is deduplicated.

Approved template:

```text
🛡 Council checks passed

Goal: {goal label}
Amount: {formatted protected value}
Council: 3 of 3 approved
Protection cost: {formatted candidate premium}
Protection ends: {formatted candidate expiry}

Review the plan in GoalGuard before generating an unsigned preview.
No transaction has been signed or sent.
```

Disputed template:

```text
⚠️ Council review disputed

Goal: {goal label}
Approved checks: {approved count} of 3

The plan cannot continue to an unsigned preview until the concerns are resolved.
No transaction has been signed or sent.
```

Blocked template:

```text
⛔ Plan stopped safely

Goal: {goal label}

The council found a blocking concern, so GoalGuard will not generate an unsigned preview for this plan.
No transaction has been signed or sent.
```

Do not put raw review concerns, model IDs, Gonka Request IDs, or inference payloads in Telegram V1. The web
audit UI remains the detailed record.

### 7.4 Unsigned preview ready receipt

Trigger: a new persisted trade with status `previewed`, created after `linked_at`.

```text
✅ Protection Plan Ready (Demo)

Goal: {goal label}
Proposed cost: {formatted premium}
Preview expires: {formatted preview expiry}

Your unsigned transaction preview was generated.
No wallet signature was requested. No funds moved, and no protected position was created.
```

If coverage mode is `proportional_demo`, append the exact formatted goal-coverage percentage and state that
the demo does not fully cover the goal. If settlement type is `physical`, append the deterministic
asset-delivery disclosure already required by the PRD. Never shorten either disclosure with model output.

### 7.5 Preview-expiry reminder

Trigger: 30 seconds before `preview_expires_at`, only when explicitly enabled and the trade is still the
latest non-expired preview for the goal.

```text
⏳ Unsigned preview expires soon

The demo preview for {goal label} expires in about 30 seconds. After it expires, return to GoalGuard and
confirm a fresh unsigned preview.

No funds have moved and no protected position exists.
```

If the delivery worker cannot send before expiration, cancel the delivery instead of sending a stale warning.

### 7.6 Goal-deadline reminders

Trigger: seven days and one day before the goal's date, at or after 09:00 in the connection's stored IANA
timezone. Send once per goal/deadline/lead-time tuple. If the worker recovers later on the same local day,
send the missed reminder; do not send it after that local date has passed.

```text
📅 Goal deadline approaching

Your {goal label} deadline is in {7 days|1 day}: {formatted deadline}.

Check the current plan in GoalGuard. An unsigned preview is not an active protection position.
```

Only send for current non-failed goals. Editing the deadline creates new dedupe keys; cancel queued reminders
for the old deadline.

### 7.7 Selected-option-expiry reminder

Trigger: when the currently selected candidate enters the final 24 hours before expiry. Send once per
candidate/expiry tuple.

```text
⏰ Demo-plan option expiry approaching

The option selected for your {goal label} demo plan expires within 24 hours: {formatted expiry}.

This message does not mean an option was purchased or a protected position exists.
```

Send only while the candidate is still selected, the goal is `ready`, and the latest council decision is
approved. Never say that the user owns the option.

## 8. Architecture

```text
Web UI
  -> POST /api/integrations/telegram/link
  -> one-time t.me deep link

Telegram
  -> POST /api/integrations/telegram/webhook (Vercel)
  -> validate webhook secret + narrow Zod update
  -> consume link / process command transactionally
  -> insert deduplicated delivery into PostgreSQL outbox

Goal/council/preview services
  -> persist canonical state
  -> enqueue lifecycle delivery in the same database transaction

Existing Render trade-monitor worker
  -> reconcile scheduled reminders
  -> claim due outbox rows with a lease
  -> Telegram Bot API sendMessage
  -> mark sent / retry / fail / block connection
```

Use the Telegram Bot API directly with native `fetch`; do not add a bot framework dependency for this small,
command-based surface. Put Telegram code under `src/lib/telegram` and mark modules that use credentials or
database access server-only.

Suggested files:

```text
src/lib/telegram/contracts.ts
src/lib/telegram/client.ts
src/lib/telegram/commands.ts
src/lib/telegram/linking.ts
src/lib/telegram/messages.ts
src/lib/telegram/notifications.ts
src/lib/telegram/repository.ts
src/lib/telegram/scheduler.ts
src/lib/telegram/service.ts
src/app/api/integrations/telegram/connection/route.ts
src/app/api/integrations/telegram/link/route.ts
src/app/api/integrations/telegram/preferences/route.ts
src/app/api/integrations/telegram/webhook/route.ts
src/components/integrations/telegram-alerts-card.tsx
scripts/setup-telegram.ts
scripts/check-telegram.ts
```

Keep route handlers thin. Routes authenticate/validate, call a service, and return a validated response.
Message rendering, command parsing, linking, scheduling, retry classification, and Bot API calls belong under
`src/lib/telegram`.

## 9. Persistence model

Add the following tables to `src/lib/db/schema.ts`. Use text plus check constraints where the repository
already follows that convention. Add Drizzle mappers and Zod schemas for every JSON or external boundary.

### 9.1 `telegram_connections`

| Column | Type | Requirements |
|---|---|---|
| `id` | UUID | Primary key. |
| `owner_session_hash` | VARCHAR(64) | Required; never expose publicly. |
| `telegram_user_id` | VARCHAR(32) | Required decimal identifier as text. |
| `telegram_chat_id` | VARCHAR(32) | Required private-chat identifier as text. |
| `status` | TEXT | `connected`, `revoked`, or `blocked`. |
| `timezone` | VARCHAR(100) | Valid IANA timezone captured from browser; default `UTC`. |
| `linked_at` | TIMESTAMPTZ | Required. |
| `last_interaction_at` | TIMESTAMPTZ | Required. |
| `revoked_at` | TIMESTAMPTZ | Nullable; required for revoked/blocked. |
| `created_at` / `updated_at` | TIMESTAMPTZ | Required. |

Add partial unique indexes so an owner session and a Telegram private chat/user can each have at most one
active (`connected`) connection. Preserve historical revoked rows.

When a valid Start token connects a Telegram account already active elsewhere, atomically revoke the prior
active connection, cancel its unsent personalized deliveries, and create the new connection. The possession
of both the new one-time browser link and the Telegram account is the transfer proof. Send neutral transfer
wording; do not reveal the old session's goals.

### 9.2 `telegram_link_tokens`

| Column | Type | Requirements |
|---|---|---|
| `id` | UUID | Primary key. |
| `owner_session_hash` | VARCHAR(64) | Required. |
| `token_hash` | VARCHAR(64) | Unique SHA-256 hex digest. |
| `timezone` | VARCHAR(100) | Valid IANA timezone or `UTC`. |
| `status` | TEXT | `pending`, `consumed`, `superseded`, or `expired`. |
| `expires_at` | TIMESTAMPTZ | Ten minutes after creation. |
| `consumed_at` | TIMESTAMPTZ | Nullable. |
| `created_at` / `updated_at` | TIMESTAMPTZ | Required. |

Generate 32 random bytes and encode them as unpadded base64url (43 characters). This fits Telegram's current
64-character start-parameter limit. Store only the SHA-256 digest; return the plaintext token once in the
no-store link response. Creating a new token supersedes other pending tokens for that owner session.

Token consumption must be a single transaction with a row lock/conditional update. Expired, used,
superseded, or unknown tokens receive the same generic response to avoid token probing.

### 9.3 `telegram_notification_preferences`

| Column | Type | Requirements |
|---|---|---|
| `connection_id` | UUID | Primary key and FK to connection. |
| `council_results` | BOOLEAN | Default true. |
| `preview_ready` | BOOLEAN | Default true. |
| `preview_expiring` | BOOLEAN | Default false. |
| `goal_deadlines` | BOOLEAN | Default true. |
| `option_expiry` | BOOLEAN | Default true. |
| `created_at` / `updated_at` | TIMESTAMPTZ | Required. |

Create preferences in the same transaction as the connection. “Pause all” updates all five values to false;
“Resume defaults” restores the documented defaults.

### 9.4 `telegram_notification_deliveries`

This is both the outbox and the delivery audit. It provides enqueue deduplication and worker retry state.

| Column | Type | Requirements |
|---|---|---|
| `id` | UUID | Primary key. |
| `connection_id` | UUID | Nullable for replies to not-yet-linked chats. |
| `telegram_chat_id` | VARCHAR(32) | Required recipient snapshot. |
| `kind` | TEXT | Allowlisted notification/command-reply kind. |
| `goal_id` / `candidate_id` / `decision_id` / `trade_id` | UUID | Nullable FKs using safe delete behavior. |
| `dedupe_key` | VARCHAR(160) | Required and globally unique. |
| `payload_json` | JSONB | Required; parse with a strict discriminated Zod schema. |
| `status` | TEXT | `pending`, `processing`, `sent`, `failed`, or `cancelled`. |
| `attempt_count` | INTEGER | Required, non-negative. |
| `next_attempt_at` | TIMESTAMPTZ | Required. |
| `lease_until` | TIMESTAMPTZ | Nullable processing lease. |
| `telegram_message_id` | VARCHAR(32) | Nullable; set after success. |
| `last_error_code` | VARCHAR(64) | Nullable sanitized category, never a raw Telegram response. |
| `created_at` / `updated_at` / `sent_at` | TIMESTAMPTZ | Required as applicable. |

`payload_json` may contain only the fields required by the templates in Section 7. It must never contain a
wallet address, transaction calldata, raw GoalGuard session, raw link token, model payload, or secret.
Validate on both write and read.

Required dedupe keys:

```text
connection:{connectionId}:{linkedAt}
command:{telegramUpdateId}
council:{decisionId}
preview-ready:{tradeId}
preview-expiring:{tradeId}
goal-deadline:{goalId}:{deadline}:{leadDays}
option-expiry:{candidateId}:{expiry}
```

### 9.5 `telegram_webhook_updates`

| Column | Type | Requirements |
|---|---|---|
| `update_id` | VARCHAR(32) | Primary key; Telegram update identifier as text. |
| `processed_at` | TIMESTAMPTZ | Required. |

Insert the update receipt, command mutation, and command-reply delivery in one database transaction. If the
transaction commits, duplicate Telegram webhook deliveries return 200 without repeating side effects. If it
rolls back, Telegram may retry. Never store the raw webhook payload.

## 10. Contracts and API routes

Add canonical public response/request schemas to `src/lib/contracts/api.ts`, export their types, and parse
all frontend responses through `src/lib/frontend/api-client.ts`.

### 10.1 `GET /api/integrations/telegram/connection`

- Resolve the anonymous GoalGuard owner session.
- Return one of `unavailable`, `disconnected`, `connected`, `paused`, or `blocked`.
- Connected/paused responses include `linkedAt` and the five booleans only.
- Never return Telegram user ID, chat ID, owner hash, tokens, or internal connection ID.
- `Cache-Control: no-store`.

### 10.2 `POST /api/integrations/telegram/link`

Request:

```ts
{ timezone: string }
```

- Require exact same-origin validation.
- Validate the IANA timezone without network access; if the browser value is absent/invalid, explicitly use
  `UTC` rather than accepting arbitrary text.
- Supersede pending tokens for the current owner session.
- If the owner session already has an active connection, return `409 CONFLICT`; switching Telegram accounts
  requires an explicit disconnect first.
- Return `{ deepLink, expiresAt }`, where `deepLink` is
  `https://t.me/{configuredBotUsername}?start={singleUseToken}`.
- Add `Cache-Control: no-store` and `Referrer-Policy: no-referrer`.
- If Telegram is not enabled/configured, return `503 TELEGRAM_UNAVAILABLE`; do not create a token.

### 10.3 `PATCH /api/integrations/telegram/preferences`

- Require exact same-origin validation and the anonymous owner session.
- Accept a strict object containing all five booleans; do not implement partial ambiguous state.
- Return the safe public connection status.
- Return not found if this browser session has no active connection.

### 10.4 `DELETE /api/integrations/telegram/connection`

- Require exact same-origin validation.
- Atomically revoke the connection and cancel pending personalized deliveries.
- Return the safe disconnected state.
- Be idempotent: an already-disconnected session returns success.

### 10.5 `POST /api/integrations/telegram/webhook`

- `runtime = "nodejs"`, `dynamic = "force-dynamic"`, and no caching.
- Do **not** apply the browser same-origin check; Telegram is the caller.
- Require `X-Telegram-Bot-Api-Secret-Token` and compare it with the configured webhook secret using a
  constant-time digest comparison.
- Reject missing/incorrect secrets before reading or persisting the body.
- Apply a conservative request-size limit and parse only the narrow Update fields needed for `message`.
- Accept forward-compatible unknown Telegram fields at the external envelope while strictly validating every
  field copied into GoalGuard persistence.
- Support only `message` updates from private chats containing text commands. Valid unsupported updates are
  acknowledged with 200 and recorded for deduplication.
- Group/supergroup/channel updates must never create a connection or reveal goal data.
- Enqueue replies and return 200 quickly. Telegram retries non-2xx webhook responses.
- Do not expose GoalGuard's standard internal error details to Telegram.

Add `TELEGRAM_UNAVAILABLE` and, if used by a web endpoint, `TELEGRAM_LINK_EXPIRED` to the canonical API error
enum. Bot replies for expired/invalid tokens remain generic and do not need to expose an API code.

## 11. Telegram client and webhook provisioning

Use official HTTPS Bot API endpoints and native `fetch`. Centralize token redaction, timeouts, and response
validation in `src/lib/telegram/client.ts`.

Required client methods:

- `getMe` for configuration checks;
- `getWebhookInfo` for the read-only smoke check;
- `setWebhook` for explicit setup only;
- `setMyCommands` for explicit setup only;
- `sendMessage` for the Render worker.

Do not call `setWebhook` or `setMyCommands` at application or worker startup. Provisioning is an explicit,
operator-run script after the Vercel URL exists.

Official constraints that the implementation must honor:

- Bot API requests use HTTPS.
- Bot deep links use `https://t.me/<bot_username>?start=<parameter>`.
- Start parameters are at most 64 base64url characters.
- `setWebhook.secret_token` is delivered in the
  `X-Telegram-Bot-Api-Secret-Token` request header.
- Telegram retries webhook requests that do not receive a 2xx response.
- `sendMessage` text must stay within Telegram's limit; V1 templates should remain well below it.

Primary references:

- Telegram Bot API: <https://core.telegram.org/bots/api>
- Telegram bot features and deep linking: <https://core.telegram.org/bots/features#deep-linking>
- Telegram deep-link syntax: <https://core.telegram.org/api/links#bot-links>

## 12. Enqueueing, scheduling, and delivery

### 12.1 Transactional lifecycle enqueue

Council result and preview-ready records must be enqueued with the canonical persistence change, not from a
React effect. Extend the repository transaction boundaries so:

- saving a new `CouncilDecision` can enqueue one council-result delivery for the active connection;
- creating a new `previewed` trade can enqueue preview-ready and scheduled preview-expiry deliveries;
- reusing a decision or replaying an idempotent preview cannot enqueue duplicates.

Keep Telegram-specific insertion in a small helper/repository called from the existing transaction. Do not
put Telegram network I/O inside a database transaction. If refactoring an existing repository method is too
risky, use an idempotent post-commit enqueue plus the reconciliation scan below; the final implementation
must demonstrate crash recovery with a test.

Before enqueueing, require an active connection, an event timestamp at or after `linked_at`, and the relevant
preference. The delivery worker must re-check connection status and preference before sending so a user can
pause/unlink after enqueue. This re-check applies to personalized lifecycle/reminder messages; command replies
and the final non-personal unlink confirmation follow the command semantics in Section 6.3.

### 12.2 Reminder reconciliation

Add a scheduler function to the existing Render worker. Run an immediate scan at worker start, then at most
once per minute while the ordinary trade-monitor loop continues.

The scan should:

- create missing seven-day and one-day deadline outbox rows;
- create a missing 24-hour selected-option-expiry row;
- cancel queued reminders whose deadline/candidate/decision is no longer current;
- create any missing lifecycle outbox row after a prior post-commit enqueue gap;
- rely on the unique dedupe key so every scan is safe to repeat.

Queries must be bounded and indexed. Do not scan raw protocol JSON or call Thetanuts/Gonka to compose a
Telegram message.

### 12.3 Delivery claiming

The existing Render worker owns delivery. Claim a bounded batch of due rows using a transaction and a lease,
so a restarted or temporarily duplicated worker cannot normally send the same row concurrently. Prefer
`FOR UPDATE SKIP LOCKED` or an equivalent atomic claim supported by PostgreSQL. Recover `processing` rows
whose lease expired.

Send sequentially in V1 and honor Telegram `retry_after` when returned. Do not invent a fixed throughput
claim; Telegram's 429 response is authoritative.

Delivery classification:

| Result | Action |
|---|---|
| Bot API success | Save Telegram message ID and mark `sent`. |
| HTTP 429 | Return to `pending` using Telegram's validated retry delay. |
| Timeout/network/5xx | Retry with bounded backoff: 30s, 2m, 10m, 1h, then fail. |
| Bot blocked/chat unavailable (validated 403 or matching permanent API result) | Mark connection `blocked`, cancel personalized pending rows. |
| Other deterministic 4xx | Mark delivery `failed` with a sanitized error category. |
| Preference disabled, connection revoked, or referenced state stale | Mark `cancelled`; do not send. |

Telegram `sendMessage` has no GoalGuard idempotency key. A timeout after Telegram accepted a request can
produce a duplicate on retry. The database prevents duplicate enqueue and concurrent claims, but delivery is
therefore at-least-once under an ambiguous network failure. Document this honestly; never claim exactly-once
delivery.

Telegram failures must not stop trade verification, heartbeat writes, or market snapshots. Catch failures at
the Telegram task boundary and continue the worker loop.

## 13. Environment and deployment

Add strict optional server configuration to `src/lib/config/env.ts` and examples to `.env.example`:

```dotenv
# Telegram companion (optional; server-only)
TELEGRAM_NOTIFICATIONS_ENABLED=false
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_LINK_TTL_SECONDS=600
TELEGRAM_REMINDER_SCAN_MS=60000
TELEGRAM_NOTIFICATION_BATCH_SIZE=20
```

Rules:

- Token, webhook secret, link tokens, chat IDs, and user IDs are never `NEXT_PUBLIC_*`.
- `TELEGRAM_NOTIFICATIONS_ENABLED` defaults to `false`; missing partial configuration is unavailable, not a
  startup crash for the core app.
- The enabled Vercel web/link/webhook configuration requires a valid bot username, webhook secret, HTTPS
  `NEXT_PUBLIC_APP_URL`, and database; it does not perform Bot API delivery.
- The enabled Render delivery configuration requires a valid bot username, bot token, app URL, and database.
- The explicit setup/check scripts require the bot token; setup also requires the webhook secret and HTTPS
  app URL.
- Validate the BotFather username shape and webhook-secret character/length rules.
- Never log the bot token. Telegram API URLs contain the token, so error sanitization must remove URLs.

Vercel needs the enable flag, bot username, webhook secret, and database access for web linking/webhook
processing. The Render worker needs the enable flag, bot token, bot username, app URL, and the same database.
The explicit setup script needs the token, webhook secret, and deployed app URL. Keep secrets out of
`vercel.json`, `render.yaml` values, git history, test snapshots, and command output.

Update `render.yaml` with `sync: false` secret declarations and safe non-secret defaults only. Do not enable
auto-deploy or add another service.

Operator setup:

1. Use BotFather to create the bot and record its exact username/token outside git.
2. Deploy the Vercel webhook route and database migration.
3. Configure matching Vercel and Render environment values.
4. Run `pnpm telegram:setup` explicitly. The script validates `getMe`, configures the exact HTTPS webhook
   `${NEXT_PUBLIC_APP_URL}/api/integrations/telegram/webhook`, restricts `allowed_updates` to `message`, and
   installs the documented commands.
5. Run `pnpm telegram:check` to read `getMe` and `getWebhookInfo` and report only redacted status.
6. Deploy/restart the existing Render worker.
7. Perform the manual smoke flow in Section 17.

`telegram:setup` is state-changing and opt-in. It must never run from `build`, `start`, migrations, tests, or
worker startup.

## 14. Task breakdown and required commits

All tasks happen sequentially on `feat/telegram-companion`. Each task should leave the branch testable; do
not combine everything into one commit. Use the exact commit subjects below unless the implementation's
actual scope materially differs.

### T0 — Product contract alignment

Work:

- Add Telegram Companion V1 to the PRD as P2 scope.
- Add the data contracts, routes, ownership rules, notification semantics, and demo-only wording.
- Cross-link this plan from the README or development documentation.

Commit:

```text
docs(prd): define Telegram companion notifications
```

### T1 — Contracts, environment, and schema

Work:

- Add public API schemas and Telegram internal payload/update schemas.
- Add strict optional environment parsing and tests.
- Add the five tables, checks, indexes, relations/mappers, and repository interfaces.
- Run `pnpm db:generate`; inspect and commit schema plus generated migration together.
- Extend PGlite repository tests for migrations, active uniqueness, ownership isolation, token consumption,
  preferences, webhook dedupe, outbox dedupe, and claiming.

Commit:

```text
feat(telegram): add contracts and notification persistence
```

### T2 — Secure one-time linking and web APIs

Work:

- Implement token generation/hashing/expiry/supersession/atomic consumption.
- Implement connection status, link, preferences, disconnect, and webhook routes.
- Implement private-chat-only `/start` processing and webhook update deduplication.
- Add route/service tests for origin checks, safe public responses, wrong webhook secrets, malformed updates,
  duplicates, groups, expired/used links, relinking, pausing, and unlinking.

Commit:

```text
feat(telegram): add secure one-time account linking
```

### T3 — Commands and deterministic messages

Work:

- Implement the documented command parser and no-LLM fallback.
- Implement `/status`, `/goals`, `/alerts`, `/stop`, `/unlink`, and `/help`.
- Add owner-scoped repository queries for at most five recent goals.
- Implement every Section 7 template using allowlisted validated facts.
- Reuse deterministic decimal/date formatting; never convert financial strings through floating point.
- Test exact safety disclosures, proportional coverage, physical settlement, status mapping, command forms,
  message-length bounds, and absence of forbidden fields.

Commit:

```text
feat(telegram): add status commands and safe message templates
```

### T4 — Lifecycle enqueue and reminders

Work:

- Enqueue council and preview events at the authoritative server-side transitions.
- Schedule preview expiry at preview creation.
- Add the idempotent reconciliation scan for deadlines, selected-option expiry, and enqueue-gap recovery.
- Test link-time cutoffs, exact dedupe keys, edited deadlines, replaced candidates, disputed/blocked wording,
  stale queued work, IANA timezone boundaries, and worker downtime recovery.

Commit:

```text
feat(telegram): enqueue plan lifecycle reminders
```

### T5 — Render outbox delivery

Work:

- Add the native Bot API client with strict response schemas, timeouts, and redaction.
- Add atomic batch claiming, leases, crash recovery, preference re-checks, retry scheduling, and permanent
  failure handling.
- Integrate delivery and once-per-minute reconciliation into `trade-monitor.ts` without weakening its
  existing error isolation or heartbeat.
- Unit-test success, 429, 403/block, 4xx, 5xx, timeout, expired lease, disabled integration, and continuation
  of non-Telegram worker duties.

Commit:

```text
feat(worker): deliver Telegram notification outbox
```

### T6 — Web connection and preference UI

Work:

- Add typed frontend client methods.
- Add `TelegramAlertsCard` to `GoalRail` with unavailable/disconnected/pending/connected/paused states.
- Capture the browser IANA timezone automatically.
- Pre-generate the no-store deep link while disconnected, use a user-clicked external link, and poll only
  while pending/visible.
- Add accessible preference controls, pause/resume, disconnect confirmation, loading, retry, and safe errors.
- Update `/dev/ui-preview` with canonical Telegram states without production fallbacks.
- Update component, visual, and E2E route mocks affected by the new self-fetching card.

Commit:

```text
feat(ui): add one-time Telegram alert controls
```

### T7 — Provisioning, documentation, and release verification

Work:

- Add explicit setup and read-only check scripts plus package commands.
- Update `.env.example`, `render.yaml`, README setup, and deployment runbook.
- Document BotFather steps, Vercel/Render secret placement, webhook rotation, disabling, unlink behavior,
  delivery limitations, and incident response.
- Run the full automated and manual verification matrix.

Commit:

```text
docs(telegram): add provisioning and operations runbook
```

If fixes are needed after full verification, make focused conventional commits describing the actual fix;
do not rewrite unrelated history merely to preserve the eight-subject list.

## 15. Testing requirements

### 15.1 Unit and contract tests

- Strict web request/response contracts and safe public projection.
- Forward-compatible narrow Telegram Update parsing.
- Command parsing including bot username suffixes, whitespace, malformed arguments, and free-form input.
- Link token shape, hash-only storage, expiry, supersession, and generic failure responses.
- Deterministic message rendering for every state and settlement/coverage disclosure.
- Date scheduling across UTC, positive/negative offsets, daylight-saving boundaries, and invalid timezone
  fallback.
- Retry classification and token/URL redaction.

Use injected clocks, random-token sources, fetch implementations, and repositories. Tests must not call the
real Telegram API.

### 15.2 Repository integration tests

Use the existing PGlite + generated migration pattern to prove:

- schema migration succeeds from an empty database;
- only one active owner/chat/user mapping exists;
- relinking transaction revokes the prior mapping without exposing prior goals;
- a token is consumed exactly once under concurrent attempts;
- duplicate Telegram update IDs have one side effect;
- outbox dedupe keys prevent duplicate lifecycle/reminder rows;
- due rows are leased atomically and expired leases recover;
- pausing/unlinking cancels or suppresses pending work;
- Telegram queries remain owner-scoped.

### 15.3 Route and service tests

- Browser mutation routes require exact origin.
- Webhook route rejects the wrong secret and never uses browser CSRF/session authentication.
- Valid unsupported updates return 200 without side effects beyond dedupe.
- Group chats cannot link or retrieve status.
- Public connection APIs never leak identifiers or tokens.
- Telegram being unconfigured returns an honest unavailable state while core APIs still work.

### 15.4 Component and E2E tests

- All card states, including blocked, render accessibly at mobile and desktop sizes.
- The one-click web CTA has a valid single-use t.me URL and clear Start instruction.
- Connected state survives page reload and a second goal in the same browser session.
- Toggling, pausing, resuming, and disconnecting use typed APIs.
- A new self-fetching card is mocked in `e2e/visual.spec.ts`, `e2e/workflow.spec.ts`, and any UI-preview tests
  so tests remain deterministic.
- Existing goal/council/preview happy path still reaches Protection Plan Ready (Demo) when Telegram is
  unavailable.
- Axe/keyboard checks cover labels, focus, external-link naming, toggles, and disconnect confirmation.

### 15.5 Required commands

Run after every relevant task and once in full before handoff:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Also run `pnpm db:generate` only when changing schema, inspect the generated migration, and use
`pnpm db:migrate` only against an explicitly configured development database. Live Telegram smoke/setup
commands are opt-in and never substitutes for mocked automated coverage.

## 16. Security and privacy checklist

- [ ] Bot token and webhook secret are server-only and absent from logs/errors/client bundles.
- [ ] Link tokens contain 256 bits of randomness, fit Telegram's deep-link limit, expire in ten minutes, are
      single-use, and are stored only as SHA-256 hashes.
- [ ] Link responses and connection endpoints are no-store.
- [ ] Webhook secret comparison is constant-time and happens before body processing.
- [ ] Telegram updates are deduplicated without persisting raw payloads.
- [ ] Only private chats can connect or read goal summaries.
- [ ] Telegram identifiers never appear in public GoalGuard API responses.
- [ ] Every goal/candidate/decision/trade lookup remains scoped to the linked owner hash.
- [ ] Unlink, block, and account transfer cancel pending personalized messages.
- [ ] No raw user message, wallet address, transaction calldata, model output, request ID, or protocol JSON is
      included in Telegram.
- [ ] Message URLs use the configured GoalGuard HTTPS origin only.
- [ ] Telegram links do not authenticate a new browser or weaken anonymous-session ownership.
- [ ] Retention is documented: connections and delivery metadata are retained only as long as operationally
      necessary; future privacy deletion/redaction must respect immutable on-chain/audit records but Telegram
      metadata is not an on-chain audit record.

## 17. Manual acceptance and smoke run

Use a test bot and non-production database first.

1. Start with Telegram disabled; confirm the web workflow completes normally and the card shows unavailable.
2. Enable/configure Vercel and Render, run the setup/check scripts, and verify the webhook URL and secret.
3. In a fresh browser session, create a goal and open the Telegram CTA.
4. Press Start in a private Telegram chat; confirm the web card changes to connected and the connection
   receipt contains the security warning.
5. Reuse the same deep link; confirm it cannot create another connection or duplicate receipt.
6. Complete an approved council review; receive one approved message with exact persisted facts.
7. Complete disputed and blocked test cases; confirm each stops safely and never suggests preview/execution.
8. Generate an unsigned preview; receive one Protection Plan Ready (Demo) receipt with the exact no-funds /
   no-position wording.
9. Test proportional and physical fixtures in non-production; confirm both deterministic disclosures.
10. Enable preview expiry; confirm one timely warning and no warning after the preview has expired.
11. Advance an injected/test clock for seven-day, one-day, and 24-hour reminders; confirm dedupe and timezone.
12. Use `/status`, `/goals`, `/alerts`, toggle commands, `/stop`, `/help`, and an unknown free-form message.
13. Send commands from a group; confirm no link or goal data is returned.
14. Unlink; confirm queued messages are cancelled and `/status` no longer returns goal data.
15. Relink the same Telegram account from another browser session; confirm the old mapping is revoked and old
    goals are not disclosed to the new session.
16. Open a plan button on a browser without the linked GoalGuard cookie; confirm safe not-found behavior.
17. Simulate Telegram 429, 403, 500, timeout, and worker restart; verify retries/leases and that the existing
    heartbeat, trade monitor, and market snapshot loop continue.
18. Search build output and logs for bot token, webhook secret, raw link token, chat ID, and raw update payload.

No manual test should sign or broadcast a blockchain transaction.

## 18. Definition of done

The feature is complete only when:

- the PRD and this plan agree on Telegram V1;
- all implementation remains on `feat/telegram-companion` with the documented atomic commits;
- a user links once through a short-lived deep link and Telegram Start;
- all messages and commands in Sections 6 and 7 work from authoritative persisted data;
- reminders are idempotently scheduled and deliveries are auditable/retryable;
- Telegram failures do not affect the GoalGuard web happy path or existing worker duties;
- browser/session ownership is not weakened, including cross-device links;
- no production fake data, secrets, private wallet data, signatures, broadcasts, or execution paths are added;
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm test:e2e` pass;
- the handoff reports branch, commits, migration name, files changed, validations run, opt-in checks not run,
  remaining operational risks, and explicit confirmation that no transaction was signed or broadcast.

## 19. Known operational limitations accepted for V1

- The user must press Start once; Telegram does not allow the bot to initiate a private chat otherwise.
- The connection follows the owner hash of the anonymous browser session that linked it. Clearing or
  expiring that browser cookie does not silently revoke existing Telegram access to those old goal summaries,
  but goals created under a new browser session require reconnecting/transferring the Telegram link.
- A plan link opened on another device does not grant GoalGuard web access.
- Bot delivery is at-least-once after ambiguous network timeouts; rare duplicate Telegram messages are
  possible even though enqueueing and normal claims are deduplicated.
- Preview-expiry reminders are intentionally default-off because previews are short-lived.
- Telegram is a notification surface, not the detailed audit view; council model/request metadata stays on
  the website.
