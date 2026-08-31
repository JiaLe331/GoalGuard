# GoalGuard

GoalGuard is a goal-first crypto downside-protection product for MUBA Hacks 2026. Users describe what money is for and when they need it; later milestones will turn that intent into a live Thetanuts protection candidate, independently review it through Gonka, and require explicit wallet approval.

This repository currently implements the **M1 foundation**. It does not parse goals, recommend trades, prepare transactions, sign messages, or execute options.

The normative product and data-contract specification is [goalguard_prd.md](./goalguard_prd.md).

## What works

- Next.js 16 App Router application with a responsive GoalGuard shell.
- Local-only goal draft composition with an explicit no-recommendation notice.
- Injected EIP-1193 wallet connection and Base network validation.
- Real, opt-in Gonka connectivity check with request-header capture.
- Real, read-only Thetanuts ETH put and market-data check.
- Strict Zod contracts for every canonical PRD entity and API payload.
- Six-table SQLite schema, generated Drizzle migration, and repository adapter.
- Isolated integration readiness API at `GET /api/integrations/status`.
- Unit, component, repository, and Playwright smoke tests.

## Architecture

```text
Browser
  ├─ GoalGuard app shell
  ├─ local draft cache (not financial state)
  └─ injected EIP-1193 wallet (no signing in M1)
          │
          v
Next.js Node runtime
  ├─ /api/integrations/status
  ├─ Gonka OpenAI-compatible adapter
  ├─ Thetanuts read-only SDK adapter ──> Base mainnet
  └─ GoalGuardRepository ─────────────> SQLite
```

Canonical JSON and TypeScript fields are camel-cased. Database columns are snake-cased and remain inside `src/lib/contracts/db-mappers.ts` and the Drizzle schema.

## Requirements

- Node.js 22 or newer.
- pnpm 11.19 or newer.
- An EIP-1193 browser wallet for the optional wallet check.
- Gonka and Base RPC credentials only when running live smoke checks.

## Setup

```powershell
pnpm install
Copy-Item .env.example .env.local
pnpm db:migrate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

The app runs without sponsor credentials and reports those services as **Needs setup**. The database defaults to `data/goalguard.db`; local database files are ignored by Git.

## Environment

| Variable | Scope | Purpose |
|---|---|---|
| `GONKA_API_KEY` | Server | Gonka broker/router credential. |
| `GONKA_BASE_URL` | Server | OpenAI-compatible Gonka endpoint. |
| `GONKA_STRATEGIST_MODEL` | Server | Model used by the M1 smoke check and future strategist. |
| `GONKA_RISK_AUDITOR_MODEL` | Server | Reserved for the future risk-auditor role. |
| `GONKA_CONSUMER_ADVOCATE_MODEL` | Server | Reserved for the future consumer-advocate role. |
| `GONKA_REQUEST_ID_HEADER` | Server | Gonka response header containing its request ID; defaults to `x-request-id`. |
| `THETANUTS_RPC_URL` | Server | Reliable Base mainnet RPC endpoint. |
| `NEXT_PUBLIC_BASE_CHAIN_ID` | Public | Must remain `8453` for P0. |
| `DATABASE_URL` | Server | SQLite file URL, default `file:./data/goalguard.db`. |
| `ENABLE_LIVE_THETANUTS_EXECUTION` | Server | Must remain `false` until organizer approval. |
| `MAX_LIVE_TRADE_PREMIUM_USD` | Server | Future live-execution cap; defaults to `3`. |

Never put a Gonka key or private signing key in a `NEXT_PUBLIC_*` variable. GoalGuard does not accept private keys.

## Commands

```powershell
pnpm dev                 # local development
pnpm lint                # ESLint
pnpm typecheck           # strict TypeScript
pnpm test                # Vitest unit/component/repository tests
pnpm test:e2e            # Playwright browser smoke test
pnpm test:e2e:install    # install the local Chromium test browser
pnpm build               # production build
pnpm check               # lint + typecheck + unit tests + build

pnpm db:generate         # generate a migration after schema edits
pnpm db:migrate          # apply committed migrations
pnpm db:studio           # inspect local data

pnpm smoke:gonka         # live, opt-in Gonka check; fails if unconfigured/degraded
pnpm smoke:thetanuts     # live, opt-in Thetanuts check; fails if unconfigured
```

The live smoke scripts load `.env.local` or `.env`. They are intentionally excluded from CI because they require credentials and external services.

## Integration status API

`GET /api/integrations/status` returns independent database, Gonka, and Thetanuts readiness states. A sponsor outage does not hide the other results, and the response never contains API keys, prompts, completions, prices, or raw protocol orders.

Gonka is `degraded` when inference succeeds but the configured request-ID header is absent. Thetanuts is checked through the official SDK with `asset: "ETH"`, `type: "put"`, and an unexpired-order filter.

## Database workflow

The checked-in migration under `drizzle/` creates:

- `goals`
- `protection_candidates`
- `gonka_inferences`
- `council_decisions`
- `council_reviews`
- `trades`

After changing `src/lib/db/schema.ts`, run `pnpm db:generate`, inspect the generated SQL, and commit the schema and migration together. SQLite is intended for one persistent Node process. Move the repository adapter to PostgreSQL before deploying multiple instances or ephemeral serverless workers.

## M1 safety boundaries

- No goal interpretation or financial recommendation.
- No mocked prices, candidates, council decisions, or transactions.
- No transaction preparation, approval, signing, or broadcast.
- No server-side private key support.
- Base mainnet is the only wallet network.
- Live execution stays disabled by default.

The next milestone is the PRD’s goal engine: natural-language input to a validated canonical `Goal`, with the Gonka Request ID stored as a related inference.
