# GoalGuard development progress

Last verified: **2026-09-05**. `goalguard_prd.md`, especially Section 17 and its P0 implementation decisions, remains normative.

| Milestone | Status | Evidence | Remaining external gate |
|---|---|---|---|
| M1 Integration skeleton | Implementation ready | Next.js app, Supabase PostgreSQL adapter, readiness endpoint, sponsor clients, and smoke scripts. | Run sponsor smoke checks with real credentials. |
| M2 Goal engine | Implementation ready | Gonka structured parsing, one-field clarification, correct `200`/`201` semantics, anonymous ownership, parse/edit/hydration routes, and fail-closed client tests. | Record a real Gonka request ID. |
| M3 Strategy engine | Implementation ready | Live OptionBook normalization, vanilla ETH-put eligibility, deterministic decimal calculations, top-three ranking, and refusal path. | Record current live market evidence with configured RPC. |
| M4 GoalGuard council | Implementation ready | Three independent role calls, two-model minimum, bounded repair, input-hash-aware caching, atomic attempt allocation, request audit metadata, deterministic consensus, and route/UI gating. | Record three real request IDs from one review. |
| M5 Trade preview | In progress | Current-record checks, request idempotency, fresh-order comparison, balances/allowance/exposure, SDK calldata, fingerprints, premium/referral gates, and unsigned preview foundations exist. | Complete the demo-only terminal preview path; no execution acceptance is required or authorized. |
| M6 Product polish | In progress | Plain-language state wording, wallet readiness, referral disclosure, responsive UI, unit/component tests, and approved preview browser path. | Complete the expanded browser error/recovery matrix and manual device/accessibility QA. |
| M7 Submission readiness | In progress | Updated PRD, README, environment template, Vercel/Render descriptors, migration, and local validation commands. | Deploy, scan history for secrets, capture preview-only sponsor evidence, and prepare submission assets. |
| M8 Telegram companion | Implementation ready | Private one-time linking, webhook commands, public preference API, lifecycle/reminder outbox, leased Render delivery, setup/check scripts, GoalRail controls, static UI states, operations runbook, and automated coverage. | Configure a test bot and deployed HTTPS Vercel/Render environment; run opt-in setup/check and manual smoke flow. |

## Safety state

- `ENABLE_LIVE_THETANUTS_EXECUTION=false` is mandatory for the submitted and demonstrated build. It is not an organizer-approval switch.
- The demo flow ends at a real unsigned Base-mainnet preview. It does not request a signature, broadcast, create a transaction hash, activate protection, or require trade-monitor health.
- No private keys, custom contract, faucet, RAG, price-prediction ML, autonomous execution, or alternative-asset recommendation are part of P0.
- Test fixtures are confined to tests; production services stop on missing or invalid upstream data.

## Required validation

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Live `smoke:*` commands remain opt-in and read-only. No burner-wallet transaction is an acceptance gate for this demo-only build.

The credential-free suite now covers structured Gonka parsing, council cache/failure behavior, deterministic strategy calculations, PostgreSQL idempotency, worker verification, and Telegram linking/delivery boundaries. `pnpm smoke:workflow` is the local hosted-Supabase read-only check for the real goal-to-unsigned-preview path.

Latest local verification: `pnpm lint`, `pnpm typecheck`, `pnpm test` (55 files, 279 tests), `pnpm exec next build --webpack`, and the home/UI-preview/workflow Playwright suites (14 tests) pass. The default Turbopack build and the full visual Playwright run remain blocked by local worker/mascot asset environment issues; live sponsor and Telegram setup commands remain opt-in and credential-gated.
