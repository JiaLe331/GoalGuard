# GoalGuard

> Protect the purpose of the money, not just the asset.

## Project description

GoalGuard is a goal-first ETH downside-protection experience built for MUBA Hacks 2026. Instead of asking a user to choose an option strike, expiry, or strategy, it starts with a real-life need such as rent, tuition, travel, or an emergency fund. GoalGuard turns that natural-language goal into structured constraints, searches live Thetanuts OptionBook inventory for a suitable ETH put, and explains the resulting protection plan in everyday language.

Every candidate is calculated and filtered by deterministic code before three independent AI reviewers assess its suitability through Gonka Router. If the plan passes those checks, the user can explicitly approve the generation of a real, unsigned Base-mainnet transaction preview.

GoalGuard is intentionally preview-only for the hackathon. It never asks for a wallet signature, broadcasts a transaction, or claims that a protected position exists. The normative product, safety, and data-contract specification is [goalguard_prd.md](./goalguard_prd.md), while [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) defines the interface and interaction system.

## Key features

- **Goal-first planning:** captures a financial goal in natural language and converts it into an editable goal type, protected value, deadline, loss tolerance, and optional premium budget.
- **Live Thetanuts discovery:** reads current Base-mainnet Thetanuts market and OptionBook order data instead of fabricating financial opportunities.
- **Deterministic strategy engine:** filters and ranks long ETH puts using deadline, cost, coverage, liquidity, and settlement constraints; all payoff scenarios and user-facing financial values are calculated in code.
- **Independent Gonka council:** a Strategist, Risk Auditor, and Consumer Advocate review the same candidate independently. The council uses at least two distinct configured models and exposes each model name, verdict, reason summary, and Gonka request ID.
- **Fail-closed consensus:** any rejection, uncertainty, malformed response, failed model call, or unmet hard constraint blocks the final preview.
- **Transparent protection plan:** shows premium cost, maximum premium loss, expiry, settlement type, estimated downside floor, deadline gap, scenarios, and council status in plain language.
- **Wallet readiness checks:** validates the connected address, Base chain, balances, allowance requirements, quote freshness, and premium cap without requesting approval or a signature.
- **Real unsigned transaction preview:** uses the official Thetanuts SDK and contract path to produce calldata and transaction details, then stops before signing or broadcast.
- **Server-authoritative persistence:** stores goals, candidates, inferences, decisions, and preview records in PostgreSQL with anonymous HttpOnly session ownership, idempotency controls, and auditable IDs.
- **Safe operational behavior:** missing integrations, stale orders, council disagreement, unsupported goals, and insufficient wallet readiness produce explicit blocking states rather than mocked production results.
- **Background verification foundation:** includes a Render worker for heartbeat and transaction, receipt, and position verification. It is dormant compatibility for a future execution-enabled flow and is not part of the current demo path.

## Hackathon track alignment

GoalGuard targets three sponsor tracks. The integrations are part of the core product path rather than isolated demonstrations: Gonka interprets and independently reviews the user’s goal, while Thetanuts provides the live options inventory and official transaction-construction path needed to produce a protection preview.

| Target track | GoalGuard contribution | Evidence judges can verify |
|---|---|---|
| **Gonka — AI for Society** | Makes downside protection more understandable and accountable for non-professional ETH holders through goal parsing, independent review, visible disagreement, and plain-language disclosures. | Enter a natural-language goal, inspect the three named council reviews, and verify the model and Gonka request ID shown for each review. |
| **Thetanuts Track 01 — Best Product on the SDK** | Turns live OptionBook inventory into a consumer-facing protection plan and constructs the exact unsigned approval/fill transaction through the official SDK path. | Inspect the live option terms, wallet-readiness checks, allowance requirement, Base chain ID, transaction target, and unsigned calldata. |
| **Thetanuts Track 02 — AI × Options** | Combines AI intent parsing and suitability review with deterministic option selection, payoff calculations, and protocol-backed transaction construction. | Follow one goal from natural-language input to a council-approved live option and final unsigned preview. |

### Gonka — AI for Society

GoalGuard uses Gonka to address a consumer problem: people saving in ETH often understand the purpose of their money but not the mechanics of options. The AI experience therefore begins with a life goal and makes uncertainty visible instead of presenting one opaque recommendation.

- **Structured goal parsing:** Gonka converts a message such as “I need $1,200 of my ETH for rent next month and cannot lose more than 5%” into an allowlisted schema. Missing information produces one concise follow-up question at a time. The model cannot choose an option or invent strikes, prices, or premiums.
- **Three independent perspectives:** the Strategist checks goal fit, the Risk Auditor looks for constraint or execution failures, and the Consumer Advocate checks clarity, suitability, and disclosures. Each role receives the same normalized goal and deterministic candidate, but never another reviewer’s verdict.
- **Model diversity:** all three roles must be configured, with at least two distinct Gonka-hosted model IDs across the council.
- **Auditable inference:** GoalGuard records each inference purpose, model, request ID, input hash, status, and latency. The UI exposes the safe model, verdict, reason, and request-ID summary without revealing private reasoning or raw provider payloads.
- **Fail-closed review:** any rejected review blocks the plan; any uncertain review disputes it; a failed or malformed call prevents approval. Only three successful `approve` verdicts produce an approved council decision.
- **Deterministic safety overlay:** AI reviewers cannot modify calculated financial values. Required physical-settlement language is also appended by code so a critical disclosure never depends solely on model behavior.

Implementation references: [`src/lib/goals/service.ts`](./src/lib/goals/service.ts), [`src/lib/gonka/client.ts`](./src/lib/gonka/client.ts), [`src/lib/council/service.ts`](./src/lib/council/service.ts), and [`src/lib/council/rules.ts`](./src/lib/council/rules.ts).

### Thetanuts Track 01 — Best Product on the SDK

Thetanuts is the source of the product’s live options opportunity. Without a suitable live order, GoalGuard refuses to generate a plan instead of substituting sample data in the production workflow.

- **Live OptionBook discovery:** the server connects to Base mainnet through primary and fallback RPC providers and reads current Thetanuts ETH put orders.
- **Goal-aware candidate construction:** deterministic code validates order shape and availability, filters candidates against the user’s deadline, loss, premium, coverage, liquidity, and settlement requirements, and ranks only viable choices.
- **Exact financial quantities:** contract quantity, premium, collateral, coverage, estimated floor, and up/flat/down scenarios are calculated from protocol values with `decimal.js`, integer base units, and the SDK’s fixed decimal conventions.
- **Official preview path:** immediately before preview, GoalGuard fetches the live order again, verifies its signature and terms, calls the SDK preview method, checks balance and allowance requirements, and encodes the exact approval and fill calldata.
- **Stale-quote protection:** a quote fingerprint binds the preview to the selected order and proposed quantity. Changed liquidity, price, expiry, settlement details, or order availability causes a safe refusal.
- **Mainnet realism without mainnet risk:** the preview uses Base chain ID `8453` and real unsigned transaction fields, but the application never invokes wallet signing or broadcast.

Implementation references: [`src/lib/thetanuts/client.ts`](./src/lib/thetanuts/client.ts), [`src/lib/thetanuts/strategy.ts`](./src/lib/thetanuts/strategy.ts), [`src/lib/thetanuts/units.ts`](./src/lib/thetanuts/units.ts), and [`src/lib/trades/service.ts`](./src/lib/trades/service.ts).

### Thetanuts Track 02 — AI × Options

The AI and options components form one end-to-end decision pipeline with explicit sources of truth:

| Stage | Responsible system | Output |
|---|---|---|
| Understand the goal | Gonka goal parser | Structured, editable protection constraints |
| Discover opportunities | Thetanuts SDK and Base RPC | Live ETH put orders and protocol state |
| Calculate and rank | GoalGuard deterministic engine | Viable candidates, quantities, costs, coverage, and payoff scenarios |
| Challenge suitability | Three independent Gonka reviewers | Role-specific verdicts, concerns, disclosures, and request IDs |
| Decide eligibility | GoalGuard consensus rules | Approved, disputed, or blocked status |
| Authorize the demo step | User | Explicit acknowledgement and wallet/network context |
| Construct the preview | Thetanuts SDK | Revalidated unsigned approval/fill transaction data |

This separation is intentional: AI handles ambiguous human intent and qualitative review, deterministic code handles money and policy, Thetanuts/Base provides market and blockchain truth, and the user remains the final decision-maker. The result is an AI-assisted options product without AI-generated financial numbers or autonomous execution.

## System architecture

```text
┌──────────────────────────────── Browser ────────────────────────────────┐
│ Next.js / React UI                                                      │
│  • goal composer and protection-plan workflow                          │
│  • EIP-1193 wallet address, network, and readiness checks               │
│  • typed API client + shared Zod response parsing                       │
│  • draft, active goal ID, and retry metadata only in browser storage    │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ same-origin HTTPS + anonymous
                                │ HttpOnly session cookie
                                ▼
┌──────────────────────── Vercel / Next.js API ──────────────────────────┐
│ Thin route handlers                                                     │
│  ├─ Goal service ───────────────────────────────► Gonka Router          │
│  │    • structured goal parsing                    • goal parser        │
│  │                                                 • 3 council roles    │
│  ├─ Strategy engine ────────────────────────────► Thetanuts + Base RPC  │
│  │    • deterministic filtering/ranking            • live orders       │
│  │    • payoff and coverage calculations           • balances          │
│  │    • fail-closed consensus                       • allowances        │
│  │                                                 • unsigned calldata  │
│  ├─ Trade-preview service                                               │
│  │    • order revalidation, premium cap, quote fingerprint             │
│  │    • execution and submission endpoints disabled                    │
│  │                                                                      │
│  └─ Drizzle repository ───────────────────────────► Supabase PostgreSQL │
│       • authoritative records, ownership, audit, idempotency            │
└─────────────────────────────────────────────────────────────────────────┘
                                      ▲
                                      │ shared server-only database access
┌────────────────────────── Render background worker ────────────────────┐
│ Heartbeat and future submitted-trade verification; inactive in demo    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Request flow

1. The UI sends the user’s goal to `POST /api/goals/parse`; Gonka returns structured intent and the server validates and persists it.
2. `POST /api/protection/candidates` reads live Thetanuts orders, applies deterministic eligibility rules, calculates scenarios, and stores viable candidates.
3. `POST /api/council/review` asks the three Gonka roles to review the selected candidate independently, then deterministic consensus logic approves, disputes, or blocks it.
4. After explicit user confirmation, `POST /api/trades/preview` revalidates the quote and wallet state, builds the official unsigned Thetanuts transaction, and stores an auditable preview.
5. The workflow ends in **Protection Plan Ready (Demo)**. Execution and submission routes return `422 EXECUTION_DISABLED`.

### Trust boundaries

- **Gonka** may parse intent, assess suitability, challenge a plan, and explain outcomes. It is never the source of truth for prices, balances, payoffs, or blockchain state.
- **Thetanuts and Base RPC** are the source of truth for orders, strikes, expiries, prices, balances, allowances, transactions, and positions.
- **GoalGuard’s deterministic services** are the source of truth for validation, ranking, calculations, consensus, and preview eligibility.
- **Supabase PostgreSQL** is the source of truth for application records. Browser storage is only a convenience cache, and the server never receives a private key.

## Tech stack

| Layer | Technology |
|---|---|
| Web application | Next.js 16 App Router, React 19, strict TypeScript 5.9 |
| Styling and UI | Tailwind CSS 4, Motion, Phosphor Icons, custom design tokens |
| Runtime and package manager | Node.js 22, pnpm 11 |
| Validation and contracts | Zod 4 shared across routes, services, persistence mappers, and the frontend client |
| AI integration | Gonka Router through the OpenAI-compatible SDK; three independent council roles |
| Blockchain | Base mainnet, ethers 6, `@thetanuts-finance/thetanuts-client` |
| Financial arithmetic | `decimal.js` plus decimal-string and base-unit-string boundaries; no floating-point financial values |
| Database | Supabase PostgreSQL, Drizzle ORM, `postgres.js` |
| Hosting | Vercel for the same-origin UI/API; Render for the background trade-monitor worker |
| Unit and component testing | Vitest, Testing Library, jsdom, PGlite |
| End-to-end and accessibility testing | Playwright, axe-core |
| Code quality | ESLint 9, TypeScript type checking |

## Setup instructions

### Prerequisites

- Node.js 22.x
- pnpm 11.25 or newer (the repository pins the package-manager version)
- A Supabase PostgreSQL project with pooled and direct/session connection URLs
- Gonka Router credentials and model IDs for all three council roles; at least two model IDs must be distinct
- Primary and fallback Base-mainnet RPC URLs for live Thetanuts reads

### 1. Install dependencies

```powershell
pnpm install
```

### 2. Create the local environment file

```powershell
Copy-Item .env.example .env.local
```

Fill in `.env.local` with your server-only credentials and URLs. The most important groups are:

- `GONKA_*` for goal parsing and the three council reviewers.
- `THETANUTS_*` for primary/fallback Base RPC access and the optional disclosed referrer.
- `DATABASE_URL` for pooled application/worker access and `DATABASE_DIRECT_URL` for migrations.
- `NEXT_PUBLIC_APP_URL` for the exact application origin.

Keep `ENABLE_LIVE_THETANUTS_EXECUTION=false`. It is a mandatory safety invariant for the submitted and demonstrated build, not an approval switch. Never place credentials, private keys, or signing secrets in `NEXT_PUBLIC_*` variables.

### 3. Apply database migrations

```powershell
pnpm db:migrate
```

Migrations use `DATABASE_DIRECT_URL`. Apply them once during setup or deployment; the Vercel application and Render worker do not migrate at startup. See [docs/supabase-deployment.md](./docs/supabase-deployment.md) for the recommended Supabase access configuration.

### 4. Start the development server

```powershell
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The application reports unavailable integrations safely when configuration is missing.

### 5. Validate the project

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Run the full non-E2E validation suite with:

```powershell
pnpm check
```

### Frontend-only preview

With `pnpm dev` running, open [http://localhost:3000/dev/ui-preview](http://localhost:3000/dev/ui-preview) to inspect the production UI panels using canonical local sample data. This development-only lab covers approved, disputed, blocked, wallet-readiness, error, recovery, and demo-ready states without calling backend routes, connecting a wallet, writing browser storage, requesting a signature, or broadcasting a transaction. It returns 404 in production.

## Environment variables

| Variable | Purpose |
|---|---|
| `GONKA_API_KEY`, `GONKA_BASE_URL` | Server-only Gonka Router configuration. |
| `GONKA_STRATEGIST_MODEL`, `GONKA_RISK_AUDITOR_MODEL`, `GONKA_CONSUMER_ADVOCATE_MODEL` | Council role models; at least two IDs must be distinct. |
| `GONKA_REQUEST_ID_HEADER` | Header used to retain the Gonka audit request ID. |
| `THETANUTS_RPC_URL`, `THETANUTS_RPC_FALLBACK_URL` | Primary and fallback Base-mainnet RPC endpoints. |
| `THETANUTS_REFERRER_ADDRESS` | Optional referrer disclosed in the unsigned preview. |
| `ENABLE_LIVE_THETANUTS_EXECUTION` | Must remain `false` for the hackathon build. |
| `MAX_LIVE_TRADE_PREMIUM_USD` | Maximum proposed preview premium; defaults to `3`. |
| `MAX_DEADLINE_GAP_HOURS` | Maximum goal deadline-to-option expiry gap; defaults to `168`. |
| `NEXT_PUBLIC_APP_URL` | Exact allowed origin and deployed application URL. |
| `DATABASE_URL` | Supabase transaction-pooler URL used by the application and worker. |
| `DATABASE_DIRECT_URL` | Direct/session URL used only by migration tooling. |
| `TRADE_WORKER_NAME`, `TRADE_WORKER_POLL_MS`, `TRADE_WORKER_HEARTBEAT_MS` | Render monitor configuration. |
| `GOALGUARD_SMOKE_*` | Optional real-integration smoke-test configuration; the wallet value is a public address only. |

## Available commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Start the local Next.js development server. |
| `pnpm build` / `pnpm start` | Build and run the production application. |
| `pnpm worker` | Start the background trade-monitor worker. |
| `pnpm lint` | Run ESLint. |
| `pnpm typecheck` | Run strict TypeScript checks without emitting files. |
| `pnpm test` | Run the Vitest suite. |
| `pnpm test:e2e` | Run Playwright end-to-end tests. |
| `pnpm check` | Run lint, typecheck, unit/component tests, and production build. |
| `pnpm db:generate` | Generate a Drizzle migration after a schema change. |
| `pnpm db:migrate` | Apply committed database migrations. |
| `pnpm db:studio` | Open Drizzle Studio. |
| `pnpm smoke:gonka` | Exercise the configured Gonka integration. |
| `pnpm smoke:thetanuts` | Exercise live Thetanuts reads. |
| `pnpm smoke:workflow` | Verify the real goal-to-unsigned-preview workflow. |

The live `smoke:*` commands are opt-in and require local credentials. `smoke:workflow` also requires the local application to be running against the hosted development database and expects execution and submission to stop with `EXECUTION_DISABLED`.

## Safety boundaries

- Base mainnet, ETH, long vanilla puts, and OptionBook only.
- No fabricated prices, fallback models, autonomous execution, signing, broadcast, custom smart contract, faucet, RAG, price-prediction model, or alternative-asset recommendation.
- Raw Gonka responses and protocol payloads remain server-side; public APIs return allowlisted summaries.
- The preview-ready state is terminal. No transaction was signed, no funds moved, and no protected position was created.
