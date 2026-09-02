# GoalGuard

GoalGuard is a goal-first ETH downside-protection product for MUBA Hacks 2026. A non-professional ETH holder describes a near-term expense, receives a deterministic live Thetanuts OptionBook candidate, sees three independent Gonka council checks, and can generate a real unsigned Base-mainnet transaction preview. The hackathon flow ends there: no wallet signature is requested, no transaction is broadcast, and no protected position is created.

The normative product and data-contract specification is [goalguard_prd.md](./goalguard_prd.md).

## Implemented P0

- Next.js 16 App Router UI and same-origin API routes for goal parsing/editing, candidate generation, council review, unsigned trade preview, and canonical hydration.
- Strict shared Zod contracts; public candidates omit server-only `protocolRaw` data.
- Deterministic vanilla ETH-put filtering, payoff scenarios, deadline/cost/coverage/liquidity checks, ranking, and explicit no-suitable-candidate refusal.
- Strategist, Risk Auditor, and Consumer Advocate Gonka calls run independently and require at least two configured models. Any reject, uncertainty, malformed response, or failed call blocks the unsigned preview.
- Exact Thetanuts SDK approval/fill encoding, wallet exposure/readiness checks, quote fingerprints, premium cap, referral disclosure, and a terminal unsigned-preview flow.
- Supabase PostgreSQL through Drizzle and `postgres.js`, with anonymous HttpOnly session ownership and PGlite repository tests.
- Render trade monitor with heartbeat, transaction/receipt/position verification, idempotent state transitions, and graceful shutdown.
- Vercel and Render deployment descriptors, Vitest coverage, and a contract-wired Playwright workflow.

## Architecture

```text
Browser wallet + Next.js UI
          │ same-origin session cookie
          v
Vercel Next.js API
  ├─ Gonka Router (goal parse + 3 independent reviews)
  ├─ Thetanuts SDK / Base RPC (market, balances, unsigned calldata)
  └─ Supabase PostgreSQL (authoritative records)
          ^
          │ dormant future compatibility only
Render trade monitor (not part of the demo flow)
```

Browser storage holds only a draft, active goal ID, and retry metadata. Supabase records remain the source of truth. The server never receives a private key.

## Requirements and setup

- Node.js 22.x
- pnpm 11.25+
- Supabase PostgreSQL pooled and direct connection URLs
- Gonka credentials and three role model IDs for the AI workflow
- A Base mainnet RPC for live Thetanuts reads

```powershell
pnpm install
Copy-Item .env.example .env.local
pnpm db:migrate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Missing integrations are reported safely. The submitted and demonstrated build is preview-only.

## Environment

| Variable | Purpose |
|---|---|
| `GONKA_API_KEY`, `GONKA_BASE_URL` | Server-only Gonka Router configuration. |
| `GONKA_STRATEGIST_MODEL`, `GONKA_RISK_AUDITOR_MODEL`, `GONKA_CONSUMER_ADVOCATE_MODEL` | Role models; at least two IDs must be distinct. |
| `GONKA_REQUEST_ID_HEADER` | Gonka audit request-ID header. |
| `THETANUTS_RPC_URL` | Base mainnet RPC. |
| `THETANUTS_REFERRER_ADDRESS` | Optional disclosed referrer for the unsigned fill preview. |
| `ENABLE_LIVE_THETANUTS_EXECUTION` | Fixed at `false` for the submitted and demonstrated build; it is not an approval switch. |
| `MAX_LIVE_TRADE_PREMIUM_USD` | Proposed preview cap; default `3`. |
| `MAX_DEADLINE_GAP_HOURS` | Maximum goal deadline-to-expiry gap; default `168`. |
| `NEXT_PUBLIC_APP_URL` | Exact allowed origin and deployed app URL. |
| `GOALGUARD_SMOKE_APP_URL`, `GOALGUARD_SMOKE_WALLET_ADDRESS`, `GOALGUARD_SMOKE_GOAL_MESSAGE` | Optional local real-integration workflow smoke configuration; the wallet value is a public address only. |
| `DATABASE_URL` | Supabase transaction-pooler URL for Vercel and Render. |
| `DATABASE_DIRECT_URL` | Direct/session URL used only by migration tooling. |
| `TRADE_WORKER_NAME`, `TRADE_WORKER_POLL_MS`, `TRADE_WORKER_HEARTBEAT_MS` | Render monitor configuration. |

Never put credentials or signing keys in `NEXT_PUBLIC_*` variables.

## Commands

```powershell
pnpm dev
pnpm build
pnpm start
pnpm worker
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm check
pnpm db:generate
pnpm db:migrate
pnpm db:studio
pnpm smoke:gonka
pnpm smoke:thetanuts
pnpm smoke:workflow
```

`smoke:workflow` requires the local app to be running against the hosted development database. It records only safe IDs and timestamps, verifies a real goal-to-unsigned-preview path, and expects execution and submission to stop with `EXECUTION_DISABLED`.

Generate and inspect schema migrations together. Apply migrations once with `DATABASE_DIRECT_URL`; neither Vercel routes nor the Render worker migrate at startup.

Follow [docs/supabase-deployment.md](./docs/supabase-deployment.md) to keep the Data API/browser roles closed and configure pooled versus migration connections.

## Safety boundaries

- Base mainnet, ETH, long vanilla puts, and OptionBook only.
- No fabricated prices, fallback models, autonomous execution, signing, broadcast, custom smart contract, faucet, RAG, price-prediction ML, or alternative-asset recommendation.
- Public APIs return allowlisted fields only. Raw Gonka and protocol payloads stay server-side.
- `ENABLE_LIVE_THETANUTS_EXECUTION=false` is mandatory. The previewed state is terminal; execute and submission routes must return `422 EXECUTION_DISABLED`.
- Demo preview ready — no transaction was signed, no funds moved, and no protected position was created.
