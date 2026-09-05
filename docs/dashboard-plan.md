# GoalGuard dashboard: implementation plan (Phases 1–2)

## Context

GoalGuard currently reads as a linear wizard — Define goal → Live options → Council review →
Confirm → Done — with nothing to see when you are not mid-flow. Wrapping that in a
Google-Finance-style three-column shell would produce a nicer container for the same thin
content, because the underlying problem is not layout: **there is no persistent subject to
return to.**

There is, however, already a market flowing through this system that we discard:

- `rankAndSelect()` (`src/lib/thetanuts/strategy.ts:203-206`) does `.slice(0, 3)` on the viable
  set. Of ~58 live ETH puts fetched per search, everything past rank 3 evaporates — it is not
  even recorded as rejected.
- Greeks (`iv`, `delta`, `gamma`, `theta`, `vega`) are already persisted in
  `protection_candidates.protocol_raw_json` for every candidate ever generated, and are read by
  no application code. They are blocked from the client by one `.omit()`.
- ETH spot already reaches the browser, unlabelled, as `scenarios[flat].settlementPriceUsd`
  (`strategy.ts:196-197` builds the flat scenario from `params.spot`).
- The `rejected` array is already returned on the success path and ignored by the client
  (`goal-workspace.tsx` only reads it on failure).
- `protection_candidates` is append-only in practice — `replaceCandidates`
  (`src/lib/db/repository.ts:96-105`) marks rows `stale` and never deletes.

So Phase 1 is mostly deletion and plumbing. Phase 2 then builds the shell, which by that point
has real content to hold.

**Organizing idea:** Google Finance's metric is *return*. GoalGuard's is the inverse — **the cost
of safety**: what it costs not to lose. Every number below derives from data already in flight.

**Out of scope (deliberately):** BTC/SOL/XRP tickers (free — already fetched and dropped — but we
only protect ETH, so it reads as terminal decoration; reverse this the day we support BTC goals),
news, candlesticks, order books, indicators, PnL, protocol-wide TVL stats.

---

## Phase 1 — Unlock the market

Near-zero new backend. This is what makes the dashboard non-cosmetic.

### 1a. Return the full ranked chain

`src/lib/thetanuts/strategy.ts`

Split "the chain we can show" from "the candidates we offer". Keep persisting a small number of
candidates (decisions); return the rest as ephemeral market context (browsing).

- `rankAndSelect()`: keep ranking, raise the persisted slice from 3 to ~5, and additionally
  return the full ranked viable list.
- `CandidateSearchResult` (`strategy.ts:90`) gains a `chain` field: for every viable order —
  strike, expiry, premium, resulting floor, coverage bps, settlement type, available depth.
  Reuse the values `evaluateOrdersForPass` already computes; do not recompute.
- Do **not** persist the full chain to `protection_candidates`. That table means "options we
  formally offered", and 58 rows per search would bloat it. Chain data is ephemeral; the
  time-series comes from 1f.

### 1b. Surface rejections on the success path

The data already reaches the browser — it is simply dropped.

- Widen `CandidateRejectionSchema` (`src/lib/contracts/api.ts:96-99`) from
  `{ protocolOrderId, reasons }` to also carry strike, expiry and premium, so rejections are
  plottable next to the chain rather than being unjoinable reason strings.
  (`protocolOrderId` is `order.signature.toLowerCase()` — `strategy.ts:52` — not a readable id.)
- Group by reason category for display: too costly / expires before deadline / gap too large /
  no liquidity / not fillable. The strings are already categorical (`strategy.ts:130-194`).
- Note `physicalPass` never runs when the cash pass succeeds (`strategy.ts:246-252`), so the
  rejection set is cash-only in the common case. Label it accordingly; do not imply completeness.

### 1c. Expose spot and IV deliberately

`PublicProtectionCandidateSchema.omit({ protocolRaw: true })`
(`src/lib/contracts/entities.ts:124-126`) is a deliberate leak guard with a test
(`contracts.test.ts:111`). **Do not unwrap `protocolRaw`.** Instead promote a curated field:

- Add `impliedVolatilityBps: number | null` to `ProtectionCandidateSchema`, populated in
  `strategy.ts` from `order.rawApiData.greeks.iv` at the same point `serializeOrder` runs
  (`strategy.ts:63`). It then flows through `publicCandidate()` normally and the guard stays intact.
- Add an explicit `ethSpotUsd` to the candidates response rather than relying on the
  `scenarios[flat]` coincidence. Source is already there: `const spot = new Decimal(market.prices.ETH)`
  (`strategy.ts:217-231`).
- Requires a `drizzle-kit generate` migration for the new candidate column.

### 1d. Cost-of-protection index

A small pure derivation — new module, e.g. `src/lib/thetanuts/protection-index.ts`:

> "Protecting $100 of ETH for 30 days costs $2.10 today."

Normalize premium per $100 protected per 30 days across the viable chain (median, not mean —
resistant to one weird strike), paired with median IV as the market's own fear gauge. Pure
function over the chain from 1a, unit-testable with fixtures, no I/O.

### 1e. Market UI

New `src/components/market/` components, using existing primitives — `Card`, `MetricCard`,
`.metric-grid`, `StatusBadge`, `Accordion`, `formatUsd`/`formatPercentFromBps`
(`src/lib/frontend/format.ts`):

- **Index header** — cost of safety, IV with a plain-language read ("protection is unusually
  cheap right now"), ETH spot, live option count, `marketAsOf`.
- **Protection chain** — grouped by expiry, each row read as protection not trading:
  strike · cost · resulting floor · coverage · depth. Rejections summarised beneath.
- **Floor gauge, not a chart** — spot against strike and floor as a horizontal band. We have no
  price history yet, and "where am I relative to my floor" is more useful for a goal product than
  a sparkline. Charts come later, once 1f has accrued data.

### 1f. Start worker snapshots — do this in Phase 1, not later

⚠️ **Timing-critical.** History only accrues in wall-clock time. If snapshotting starts when the
chart is built, the chart is empty on demo day.

`src/worker/trade-monitor.ts` is currently a complete no-op: execution is disabled
(`src/lib/trades/service.ts:87-88` throws `EXECUTION_DISABLED`), so no trade reaches `submitted`,
so `poll()` iterates an always-empty list every 5s. It already holds a configured Thetanuts
client, RPC failover (`withConfiguredThetanutsRead`, `client-core.ts:83-93`), the repository,
heartbeat and SIGTERM handling.

- Add a second, slower branch to the existing `run()` loop (`trade-monitor.ts:32-40`) gated on a
  new `MARKET_SNAPSHOT_MS` env var in `src/lib/config/env.ts` (alongside the existing
  `TRADE_WORKER_*` vars at lines 27-29). Suggest 5–15 minutes.
- New `market_snapshots` table — deliberately small: `captured_at`, `eth_spot_usd`,
  `option_count`, `median_iv_bps`, `cost_per_100_usd_30d`. Not the whole book.
- Worker is Render-only (`render.yaml`, `autoDeploy: false`) and not started by `pnpm dev`.
  Start it, or accept that snapshots only accrue in the deployed environment.

---

## Phase 2 — The dashboard shell

Only now does a three-column layout have something to hold. The key structural change: **there is
currently no app home that is not the marketing page** — `/` is marketing, `/goals/[goalId]` is
the wizard. The protection market becomes the home, so the centre column has content even with
zero goals.

```
LEFT 17rem          CENTER minmax(0,1fr)              RIGHT 23rem
[+ New goal]        Cost of safety · IV · ETH spot    Niu Lai mascot rail
YOUR GOALS          ─ Market │ Plan │ Scenarios │ Audit ─   AI COUNCIL
● Emergency $200    PROTECTION AVAILABLE               ● Strategist  approve
  floor holding     Sep 11 ┃ $2350 $2.78 floor $189    ◐ Risk Auditor running
○ Rent $1,200       Sep 18 ┃ $2400 $3.40 floor $194    ○ Consumer Adv. waiting
── Market ──        not viable: 12 too costly …        1 of 3 passed
● Gonka ● Thetanuts [ floor ▔▔ spot ● ▔▔ goal ]        [Re-review]
```

### 2a. Prep (no visual change)

- Extract the 5-step tracker out of `StageShell` (`workflow-primitives.tsx:24-67`, `steps` const
  at line 22) into a standalone `StageProgress`; keep `StageShell` delegating so nothing breaks yet.
- Add layout tokens to `src/styles/tokens.css`: `--rail-left`, `--rail-right`, `--header-height`
  (7rem is currently hardcoded twice in `globals.css`), plus a small z-index scale (today the only
  values are `.skip-link`'s 110 and the navbar's `z-50`).

### 2b. `DashboardShell`

New `src/components/dashboard/dashboard-shell.tsx`:

- `xl:grid-cols-[17rem_minmax(0,1fr)_23rem]`. The 23rem is not arbitrary — every workflow panel
  already uses a 22–24rem `<aside>` (`workflow-panels.tsx:124, 275, 431`), so hoisting is near-free.
- Responsive: `lg` → left + centre, council returns to a drawer; `<lg` → single column, left rail
  folds into the navbar's existing mobile `Drawer`, council folds into today's `CouncilDrawer`.
  **The mobile fallback is current behaviour** — nothing to invent.
- One `<main>`, one `<h1>`, real landmarks (`<nav aria-label="Goals">`, `<aside aria-label="AI Council">`).
- **Keep `.workflow-stage` (or its `container-type: inline-size`) on the centre column.**
  `ScenarioComparison`'s responsive layout is a `@container (min-width: 34rem)` query
  (`globals.css:191`) that silently collapses without it — and `e2e/visual.spec.ts` waits on that
  class for 10 screens × 5 widths × 2 themes.

### 2c. Populate the rails

| Slot | Reuse | Change |
|---|---|---|
| Top bar | `FloatingEditorialNavbar variant="workflow"` | extend its mobile Drawer to the workflow variant |
| Left: goals | `RecentGoalsList` | denser rows, active highlight, health dot |
| Left: services | `IntegrationStatus` | none — self-fetching drop-in |
| Left: market strip | new, from 1d | — |
| Right: mascot | `NiulaiChatRail` + `resolveNiulaiChatState()` | **finally ships** — currently renders zero pixels in production; this is the "mascot when loading" idea |
| Right: live council | `CouncilRoleProgressCard` | none — purpose-built |
| Right: verdicts | `CouncilCard` | delete the `<Drawer>` wrapper (`workflow-panels.tsx:340-351`) |
| Right: consensus/CTAs | `ProtectionPlanPanel`'s `<aside>` | hoist out |
| Mobile right rail | `CouncilDrawer` | none |

### 2d. Centre tabs and flow placement

Stages stop choosing *which screen you see* and start choosing *what state each region is in*.
The state already supports this: `WorkflowState` holds goal, candidates, selectedCandidate,
decision, preview and trade simultaneously, and `error` retains all data — so regions can render
off data presence with **zero reducer changes**.

- Tabs: **Market** (default when idle) │ Plan │ Scenarios │ Audit.
- Loading stops being a takeover: during `reviewing_candidate` the right rail shows live council
  cards while the centre keeps showing the goal and candidate.
- **Gated actions stay focused.** `PreviewConfirmationPanel` (already modal-shaped — one card, no
  aside, fully prop-controlled) becomes a `Drawer`; `DemoPreviewReadyPanel` stays a full-width
  takeover. This preserves the acknowledgment guards, so no reducer changes are needed there.
- Errors become an inline banner in the affected region.

### 2e. The one real state bug this exposes

`goal_updated` does not clear `candidates` / `selectedCandidate` / `decision`
(`src/lib/frontend/workflow.ts`). Invisible in a wizard because the stage jumps away; in a
dashboard you would see a stale council verdict beside an edited goal. Add a `planStale` flag plus
a "these results are for a previous version of this goal" banner rather than clearing — clearing
throws away context the user may still want.

Also: `hydrate` resets `candidates` to `[]`, so the alternatives list is empty after reload. Fix
by having `GET /api/goals/[goalId]` return candidates, or accept it for now.

---

## Verification

- **Unit**: pure-function tests for the index derivation (1d) and chain/rejection grouping, using
  `src/test/fixtures/goalguard.ts`.
- **Repository**: PGlite integration test for the snapshot write (1f), following the existing
  pattern in `src/lib/db/repository.test.ts`.
- **Contract**: assert `impliedVolatilityBps` is present on the public candidate **and** that
  `protocolRaw` still is not — extend the existing guard test rather than replacing it.
- **Live E2E via Playwright**: create a goal, confirm the Market tab shows a chain with more than
  three options grouped by expiry, rejections summarised, index header populated, and that the
  council rail updates live during review without the centre being replaced.
- Full `pnpm check` (lint + typecheck + test + build) before each phase lands.

## Test churn to expect

- `e2e/visual.spec.ts` — hard-depends on `.workflow-stage`; keep that class on the centre column
  and it survives.
- `e2e/workflow.spec.ts` — unqualified `getByRole("checkbox")` breaks the moment two checkboxes
  co-exist; also `{ exact: true }` text matches that a denser page can duplicate.
- `e2e/ui-preview.spec.ts` — overflow sweep across 9 viewports and mascot-clearance geometry; a
  multi-column layout is exactly what trips these.
- `src/components/workflow/workflow-panels.test.tsx` — mascot counts and checkbox counts assume
  panels do not co-exist; the `suppressMascot` pattern needs generalising.
- `/dev/ui-preview` is a **second parallel orchestrator** (`ui-preview-lab.tsx`) with its own stage
  mapping — it must move in lockstep or the visual suite breaks.
- Fixed element ids (`stage-title`, `scenario-title`, `readiness-title`, `goal-error-summary`)
  prevent two instances on one page — scope or generate them in 2d.
- Re-run axe: a denser multi-panel page is a genuine new risk surface (duplicate ids, heading
  order, landmark uniqueness).

## Decisions needed

1. **Cross-user market data.** A market-wide cost index reads `protection_candidates` across all
   users (no owner column; ownership is a join through `goals`). Reasonable for market data, but
   note RLS is enabled with **zero policies** and the app connects as table owner — choose this
   explicitly rather than inheriting it. Alternative: derive the index only from the worker's own
   `market_snapshots`, which has no user association at all. *Recommended: the latter.*
2. **Does `/goals/new` adopt the shell**, or stay a focused single-purpose page? *Recommended: stay focused.*
3. **Does the right rail ever take free-form questions**, or stay read-only council status?
   *Recommended: read-only for now — the council is system-driven, not a chat.*
4. **Persisted candidate count** — raise from 3 to 5, or leave at 3 and rely on the ephemeral
   chain for browsing?

## Sequencing note

Phase 1 delivers the market and is mostly deletion; Phase 2 delivers the shell. If time runs out,
**Phase 1 alone is still worth shipping** — a richer centre column inside today's layout beats an
empty three-column shell. The reverse is not true.
