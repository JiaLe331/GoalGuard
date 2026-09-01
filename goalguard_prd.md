# GoalGuard — Product Requirements Document

**Hackathon:** MUBA Hacks 2026  
**Target tracks:** Gonka — AI for Society; Thetanuts Track 01 — Best Product on the SDK; Thetanuts Track 02 — AI × Options  
**Team size:** 3  
**Document purpose:** Implementation-ready PRD for Codex and the development team.  
**Status:** Locked concept / build phase

---

## 1. Product Overview

### 1.1 Product name
**GoalGuard**

### 1.2 Core AI system
**GoalGuard**

### 1.3 One-line pitch
Tell GoalGuard what money matters to you and when you need it; GoalGuard independently reviews a live options-based protection plan before GoalGuard lets you execute it through Thetanuts.

### 1.4 Product thesis
Most retail users do not think in strikes, expiries, premiums, or option Greeks. They think in goals:

- “I need this money for rent next month.”
- “This is my tuition fund.”
- “I need at least $1,000 for my trip in October.”

GoalGuard converts a natural-language life goal into a transparent downside-protection plan. The user sees the goal, deadline, protection cost, downside outcome, council decision, and final trade — not a trading terminal.

### 1.5 Primary value proposition
**Protect the purpose of the money, not just the asset.**

### 1.6 Why options are essential
GoalGuard is not a generic financial chatbot. Its core function depends on live on-chain options from Thetanuts. Without Thetanuts market data and execution, GoalGuard cannot create or execute the protection plan.

---

## 2. Hackathon Track Alignment

### 2.1 Gonka — AI for Society
GoalGuard targets consumer financial literacy and protection for everyday crypto holders.

Required implementation alignment:

- All AI reasoning must run through Gonka Router.
- Use multiple Gonka-hosted models for independent review.
- Expose the exact Gonka Request ID for each council inference.
- Detect and surface model disagreement.
- Do not hide uncertainty behind a single AI answer.
- The user must remain the final decision-maker.

GoalGuard is the core Gonka differentiator: separate models review the same user goal and deterministic trade data from different perspectives before a plan can be approved.

### 2.2 Thetanuts Track 01 — Best Product on the SDK
GoalGuard is a consumer product built around live on-chain options.

Thetanuts is integral because the app must:

- read live market/order data;
- build a protection plan from actual available options;
- calculate outcomes from real option parameters;
- preview the proposed transaction;
- execute the selected option through Thetanuts.

The product should still make sense to a non-options user. The user buys “protect my rent fund,” not “ETH 3200P.”

### 2.3 Thetanuts Track 02 — AI × Options
GoalGuard must complete an AI-assisted live options workflow:

1. User expresses a protection goal in natural language.
2. AI converts the goal into structured constraints.
3. The system finds viable live Thetanuts options.
4. GoalGuard independently evaluates the candidate plan.
5. User explicitly approves the trade.
6. GoalGuard executes a real on-chain options trade through Thetanuts.

No paper-trading-only submission.

---

## 3. Product Goals

### 3.1 P0 product goals

1. Turn a natural-language financial goal into structured protection constraints.
2. Use live Thetanuts data to find at least one real downside-protection candidate.
3. Use deterministic code for all financial calculations.
4. Use GoalGuard through Gonka Router to evaluate whether the candidate matches the user’s goal and risk limits.
5. Show each council role, verdict, reason summary, model name, and Gonka Request ID.
6. Require explicit user confirmation before any transaction.
7. Execute a real Thetanuts trade when the feature is enabled and organizer rules permit it.
8. Show the resulting transaction/position state in the GoalGuard UI.

### 3.2 Product principles

- **Goal-first:** user starts with a real-life objective, not a financial instrument.
- **AI explains; code calculates:** LLMs never invent prices, premiums, strikes, payoff values, balances, or transaction state.
- **Independent review:** council agents do not blindly repeat the first model’s conclusion.
- **Human approval:** no autonomous financial execution in P0.
- **Transparent uncertainty:** disagreement blocks or downgrades a recommendation.
- **Simple UI:** hide unnecessary options jargon by default; make details expandable.
- **Real protocol usage:** live Thetanuts integration must be central to the workflow.

---

## 4. Non-Goals

The following are explicitly out of P0 scope:

- autonomous recurring hedging;
- automatic rebalancing or rolling positions;
- price prediction;
- “best trade” speculation or alpha generation;
- full portfolio management;
- multi-chain support;
- Sui integration;
- custom smart-contract development unless absolutely required by the current Thetanuts SDK;
- social trading;
- copy trading;
- lending/borrowing;
- options Greeks dashboard;
- support for every crypto asset;
- voice input;
- mobile-native application;
- multilingual UI;
- custodial wallets;
- execution without user confirmation.

---

## 5. Target User and Primary User Story

### 5.1 Primary persona
A non-professional crypto holder who owns ETH but has already allocated part of its value to an important near-term real-world expense.

The user understands crypto at a basic level but does not understand options well enough to manually choose strikes, expiries, or premiums.

### 5.2 Canonical user story
> “I have $1,200 in ETH for rent next month. I can’t afford to lose more than 5%.”

GoalGuard should turn that into a structured goal and a live protection plan.

### 5.3 Supported goal categories for P0

- Rent
- Tuition
- Travel
- Emergency fund
- Custom goal

These categories are UX labels only. The underlying engine should work from structured constraints, not hardcoded strategy logic per category.

---

## 6. End-to-End User Flow

### Step 1 — Start goal
User opens GoalGuard and sees:

> What are you protecting?

Suggested chips:

- Rent
- Tuition
- Travel
- Emergency fund
- Something else

User can type naturally instead.

### Step 2 — Parse the goal
Example input:

> “I have $1,200 in ETH for rent next month and I can’t afford to lose more than 5%.”

GoalGuard extracts:

- goal type;
- underlying asset;
- protected value;
- deadline;
- maximum acceptable loss;
- optional maximum premium budget if provided.

If a required field is missing, GoalGuard asks one concise follow-up question at a time.

### Step 3 — Confirm structured intent
Before fetching a strategy, show a simple goal card:

- Goal: Rent
- Asset: ETH
- Value to protect: $1,200
- Needed by: 30 Sep 2026
- Maximum acceptable loss: 5%

User can edit any field.

### Step 4 — Fetch live Thetanuts opportunities
The strategy engine reads current Thetanuts market/order data and builds viable downside-protection candidates.

For P0, prioritize simple long-put protection for ETH.

### Step 5 — Deterministic candidate evaluation
For every candidate, code calculates:

- strike;
- expiry;
- premium/cost;
- notional/contract exposure;
- relevant payoff scenarios;
- maximum premium at risk;
- estimated protected value/floor at expiry;
- gap between requested deadline and actual expiry;
- whether candidate satisfies hard user constraints.

Reject impossible candidates before sending anything to GoalGuard.

### Step 6 — GoalGuard review
The top viable candidate is reviewed independently by the GoalGuard roles through Gonka Router.

No council role may modify deterministic financial values.

### Step 7 — Present protection plan
Show a plain-language card such as:

**Rent Protection**

- Goal value: $1,200
- Protection expiry: 30 Sep
- Protection cost: $X
- Maximum premium loss: $X
- Estimated downside floor at expiry: $Y
- Council status: Approved / Disputed / Blocked

Expandable sections:

- Why this option?
- What happens if ETH rises?
- What happens if ETH falls?
- GoalGuard review
- Protocol details

### Step 8 — User approval
The user must explicitly click a confirmation action after reviewing:

- exact trade cost;
- expiry;
- maximum premium loss;
- wallet/network;
- GoalGuard status.

### Step 9 — Trade execution
When enabled, execute the Thetanuts trade using the connected wallet.

The app must never sign or submit without an explicit user action.

### Step 10 — Protected goal state
After transaction confirmation, update the goal card:

**Rent — Protected**

Display:

- protected goal;
- transaction hash/digest;
- option position details;
- trade timestamp;
- council decision reference;
- Gonka Request IDs.

---

## 7. Product Scope

### 7.1 P0 — Must Ship

#### Core UX
- Landing/chat experience.
- Goal preset chips.
- Natural-language goal entry.
- Structured goal confirmation/editing.
- Protection plan card.
- GoalGuard status display.
- Trade confirmation flow.
- Protected-goal success state.

#### Gonka
- Gonka Router client.
- Goal extraction through Gonka.
- Three GoalGuard roles.
- At least two distinct Gonka-hosted models across the council.
- Structured JSON outputs.
- Store/display request IDs.
- Disagreement handling.

#### Thetanuts
- Connect to Base using a reliable RPC provider.
- Read live Thetanuts orders/market data.
- Build valid protection candidates.
- Deterministically calculate user-facing outcomes.
- Preview the trade before execution where supported by the current SDK.
- Execute one real trade through the current official Thetanuts SDK/contract flow when permitted.
- Display transaction result.

#### Safety
- Explicit user confirmation.
- No private keys stored in source code.
- Exact token approvals only where supported.
- Trade-size cap for hackathon demo.
- Dry-run/preview before real execution where available.

### 7.2 P1 — Winning Polish

- Animated “GoalGuard reviewing” state.
- Council member cards with model names and Request IDs.
- Simple scenario chart for ETH up / flat / down.
- Saved goal state in local storage or lightweight persistence.
- “Why this protects my goal” explanation.
- Better empty/loading/error states.
- Goal progress visual.
- Wallet balance and network checks.
- Transaction explorer link.

### 7.3 P2 — Stretch

- OptionFactory/RFQ for custom strike/expiry if live OptionBook inventory cannot match the user’s goal well.
- Multiple concurrent goals.
- Multilingual UI.
- Automatic goal monitoring.
- Optional protection reminders.
- Recurring/rolling hedges with explicit user re-approval.
- Import wallet exposure automatically.
- Goal templates for salary, freelance income, and merchant revenue.

---

## 8. GoalGuard Design

### 8.1 Purpose
GoalGuard prevents a single LLM from directly controlling a financial decision.

Each role independently evaluates the same normalized goal and the same deterministic candidate data.

### 8.2 Council roles

#### A. Strategist
Purpose: decide whether the candidate is a sensible way to satisfy the goal.

Must answer:

- Does the option direction make sense for the stated goal?
- Does the expiry reasonably match the deadline?
- Does the protection structure match the user’s requested downside tolerance?
- Is there a clearly better candidate among the supplied alternatives?

The Strategist does **not** calculate prices or payoff numbers.

#### B. Risk Auditor
Purpose: actively look for reasons the candidate should not be presented or executed.

Must check:

- premium exceeds user budget;
- expiry mismatch;
- insufficient protection;
- misleading interpretation;
- strategy introduces risk outside the user’s stated intent;
- candidate data is incomplete or contradictory;
- trade assumptions are unsupported.

The Risk Auditor should be adversarial by design.

#### C. Consumer Advocate
Purpose: verify that the plan is understandable and actually serves the user’s goal.

Must check:

- explanation is understandable to a non-options user;
- user is not being pushed into speculation;
- maximum known cost is clearly stated;
- major limitations are disclosed;
- the recommendation does not overstate the level of protection.

### 8.3 Independence requirement
Each council role must receive:

- the normalized goal;
- deterministic candidate data;
- relevant protocol metadata;
- the role-specific prompt.

Roles should not see another role’s verdict before returning their own decision.

### 8.4 Model requirement
Use at least two distinct Gonka-hosted models.

Preferred implementation:

- Strategist: Model A
- Risk Auditor: Model B
- Consumer Advocate: Model C

If only two reliable models are available, the Consumer Advocate may reuse A or B with a distinct role prompt. Exact model IDs must come from the current Gonka Router model catalog; do not hardcode stale IDs from old examples.

### 8.5 Council output schema

Council models must return the review content required by the canonical `CouncilReview` contract in Section 17.4.4. The backend, not the model, adds IDs, inference references, model/request metadata, timestamps, and `schemaVersion` after validating the structured output.

Model-produced confidence is normalized to integer `confidenceBps` (`0..10000`); floating-point `0..1` confidence must not cross the API or persistence boundary.

### 8.6 Consensus logic
Consensus is deterministic application code, not another LLM vote.

P0 rule:

- Strategist must return `approve`.
- Risk Auditor must return `approve`.
- Consumer Advocate must return `approve`.
- All hard financial constraints must pass deterministic validation.
- Any `reject` blocks execution.
- Any `uncertain` blocks execution in P0 and shows the disagreement to the user.

Result states use the canonical `CouncilStatus` enum in Section 17.3.

Only `approved` can progress to trade confirmation.

### 8.7 Transparency
UI must expose:

- council role;
- model used;
- verdict;
- concise reasoning summary;
- concerns;
- Gonka Request ID.

Do not expose or request private model chain-of-thought. Show concise evidence/reason summaries instead.

---

## 9. Goal Parsing

### 9.1 Normalized goal schema

Goal parsing returns the canonical `GoalDraft` contract in Section 17.9.1. Once all required fields validate, the backend persists and returns the canonical `Goal` entity in Section 17.4.1.

The parse inference and its Gonka Request ID are stored as a related `GonkaInference`; they are not duplicated as free-form fields on the database goal row.

### 9.2 Required fields

- underlying asset;
- protected value in USD;
- deadline;
- max acceptable loss percentage.

### 9.3 Validation rules

- `protectedValueUsd > 0`
- `0 <= maxLossBps < 10000` (`500` means 5.00%)
- deadline must be in the future;
- asset must be supported by P0;
- if premium budget exists, `maxPremiumUsd > 0`;
- money fields use canonical decimal strings, not JavaScript numbers.

### 9.4 Missing data behavior
Ask only for missing information. Do not re-ask information already extracted confidently.

---

## 10. Thetanuts Strategy Engine

### 10.1 P0 supported strategy
**Long put downside protection for ETH.**

Do not implement speculative calls, short options, spreads, or complex multi-leg strategies in P0.

### 10.2 Data source
Use the **current official Thetanuts SDK/repository as the source of truth**. Workshop slides are secondary if implementation details differ.

The strategy engine should use current SDK functions for:

- fetching available orders/markets;
- reading pricing/market metadata;
- previewing a trade where available;
- executing/filling a selected order;
- reading resulting positions.

Do not invent contract addresses or protocol schemas.

### 10.3 Candidate generation

1. Fetch live ETH put opportunities.
2. Discard invalid/expired/unfillable orders.
3. Filter expiries close enough to the user deadline.
4. Calculate trade cost and payoff scenarios deterministically.
5. Reject candidates that violate hard user limits.
6. Rank remaining candidates.
7. Send top candidate plus 1–2 alternatives to GoalGuard.

### 10.4 Candidate schema

Use the canonical `ProtectionCandidate` and `ScenarioResult` contracts in Section 17.4.2. All live protocol quantities must preserve both normalized decimal display values and base-unit integer strings where required for execution.

### 10.5 Financial calculation rule
All calculations must come from deterministic code using live protocol values.

The LLM may explain a result but must never originate:

- strike;
- premium;
- expiry;
- notional;
- payoff;
- balance;
- transaction cost;
- transaction status.

Where contract units or settlement formulas are protocol-specific, derive them from the official Thetanuts SDK/contracts instead of assuming conventional units.

### 10.6 Candidate ranking
Start with an explainable deterministic scoring function.

Suggested priorities:

1. Satisfies hard constraints.
2. Expiry is on or shortly after the deadline.
3. Better downside floor relative to the goal.
4. Lower premium.
5. Higher available liquidity/fillability.

Do not use an LLM to rank raw market orders in P0.

### 10.7 No suitable option
If no viable order exists:

- do not fabricate a plan;
- explain that no suitable live protection is currently available;
- optionally show the closest rejected candidate and why it failed;
- P2 may fall back to OptionFactory/RFQ.

---

## 11. Trade Preview and Execution

### 11.1 Execution philosophy
The user must see the exact proposed trade before execution.

### 11.2 Required pre-trade checks

- wallet connected;
- correct Base network;
- sufficient gas token;
- sufficient settlement/premium token;
- council status is `approved`;
- candidate is not expired;
- live price/order is still valid;
- preview succeeds where supported;
- user explicitly confirms.

### 11.3 Approval policy
Never request unlimited token approval in P0 if the protocol permits exact-amount approval.

### 11.4 Trade size guardrail
Add a configurable hackathon safety cap.

```env
MAX_LIVE_TRADE_PREMIUM_USD=3
```

If the full requested protection exceeds the cap, GoalGuard may:

- show the full protection plan as a preview;
- offer a clearly labelled **proportional micro-hedge demo trade** using the same execution path;
- never imply that the micro-trade fully protects the original goal.

Production-sized execution is outside the hackathon safety default.

### 11.5 Mainnet feature flag
The MUBA general rules contain a mainnet/real-funds restriction while the Thetanuts track requires a real live trade. Until organizers explicitly confirm the permitted interpretation, keep execution behind a feature flag:

```env
ENABLE_LIVE_THETANUTS_EXECUTION=false
```

Codex should implement the execution path, but the UI must not enable it unless the flag is true.

### 11.6 Trade record

Use the canonical `Trade` contract in Section 17.4.5. Preview, wallet-signature, submission, confirmation, failure, cancellation, and stale-quote states are distinct; a transaction hash is nullable until wallet broadcast and cannot by itself mark a trade confirmed.

---

## 12. UX Requirements

### 12.1 Product style
GoalGuard should feel like an AI assistant, not a derivatives terminal.

Default experience:

- chat-led;
- plain language;
- visual goal cards;
- financial details available progressively;
- explicit approval points.

### 12.2 Screen/state list

#### A. Landing / New Goal
Required:

- GoalGuard branding.
- “What are you protecting?” prompt.
- goal chips;
- free-text input;
- connect wallet action available but not mandatory before goal creation.

#### B. Goal Confirmation
Display normalized fields and allow edit.

#### C. Searching State
Show distinct stages:

1. Reading your goal
2. Checking live protection options
3. GoalGuard reviewing

Do not fake progress. Tie state to actual backend steps.

#### D. Protection Plan
Show only the most important values first:

- goal;
- amount;
- deadline;
- protection cost;
- estimated protected floor;
- expiry;
- council status.

#### E. GoalGuard Drawer
Show three role cards:

- Strategist
- Risk Auditor
- Consumer Advocate

Each card:

- model name;
- approve/reject/uncertain;
- short summary;
- concerns;
- Gonka Request ID.

#### F. Confirm Trade
Must display:

- exact premium/cost;
- maximum premium loss;
- option expiry;
- what the option protects;
- clear limitation that protection is evaluated at the option settlement/expiry conditions;
- wallet/network;
- final CTA.

#### G. Success / Protected Goal
Display:

- “Protected” status;
- goal card;
- trade details;
- transaction hash/explorer link;
- council approval reference.

### 12.3 Language rules
Prefer:

- “Protection cost” over “premium” in primary UI.
- “Protection ends on” over “expiry” in primary UI.
- “Amount you need to preserve” over “notional” in primary UI.

Protocol terminology may appear in expandable technical details.

### 12.4 Avoid misleading guarantees
Do not use copy such as:

- “Your rent is guaranteed.”
- “You cannot lose money.”
- “Risk-free.”

Prefer:

- “This option provides downside protection under the displayed payoff conditions.”
- “Estimated protected value at expiry.”
- “Protection depends on the executed position and settlement conditions.”

---

## 13. Technical Architecture

### 13.1 Recommended stack
This is an implementation choice, not a sponsor requirement.

Use a TypeScript-first stack to minimize integration friction with the Thetanuts SDK.

Recommended:

- **Frontend + server:** Next.js + TypeScript
- **Styling:** Tailwind CSS
- **Wallet:** one EIP-1193-compatible Base wallet flow; avoid supporting many wallet providers in P0
- **Blockchain:** ethers + official Thetanuts SDK
- **AI:** Gonka Router through its current OpenAI-compatible or supported API interface
- **Persistence:** one repository adapter implementing Section 17.10, backed by SQLite/PostgreSQL or an equivalent lightweight store. Browser storage may cache UI state but is not the source of truth for council decisions, inference IDs, previews, or trades.

### 13.2 Logical architecture

```text
User
  |
  v
Next.js UI
  |
  +--> Goal API -----------------------> Gonka Router
  |        |                               |- Goal parser
  |        |                               |- Strategist
  |        |                               |- Risk Auditor
  |        |                               `- Consumer Advocate
  |        |
  |        `--> Consensus Engine
  |
  +--> Strategy API -------------------> Thetanuts SDK
  |                                        |- market/orders
  |                                        |- candidate data
  |                                        `- preview
  |
  `--> Wallet / Execution ------------> Base / Thetanuts
                                           `- transaction
```

### 13.3 Trust boundaries

#### LLM boundary
Gonka may:

- parse intent;
- evaluate candidate suitability;
- challenge a recommendation;
- explain outcomes in simple language.

Gonka may **not** be the source of truth for financial values or blockchain state.

#### Protocol boundary
Thetanuts/current Base RPC is the source of truth for:

- available orders;
- strikes;
- expiries;
- prices;
- balances;
- approvals;
- transaction state;
- positions.

#### App boundary
GoalGuard deterministic code is the source of truth for:

- validation;
- candidate ranking;
- scenario calculations;
- council consensus;
- trade eligibility.

---

## 14. API / Module Boundaries

Codex should keep modules separable so the 3-person team can work in parallel.

### 14.1 AI modules

```text
/lib/gonka/client.ts
/lib/gonka/goal-parser.ts
/lib/gonka/council/strategist.ts
/lib/gonka/council/risk-auditor.ts
/lib/gonka/council/consumer-advocate.ts
/lib/gonka/council/consensus.ts
```

### 14.2 Thetanuts modules

```text
/lib/thetanuts/client.ts
/lib/thetanuts/markets.ts
/lib/thetanuts/candidates.ts
/lib/thetanuts/payoff.ts
/lib/thetanuts/preview.ts
/lib/thetanuts/execute.ts
```

### 14.3 Domain modules

```text
/lib/goals/schema.ts
/lib/goals/validation.ts
/lib/protection/ranking.ts
/lib/protection/scenarios.ts
/lib/trades/schema.ts
```

### 14.4 Suggested API routes

```text
POST /api/goals/parse
POST /api/protection/candidates
POST /api/council/review
POST /api/trades/preview
POST /api/trades/execute
POST /api/trades/{tradeId}/submission
GET  /api/trades/{tradeId}
GET  /api/goals/{goalId}
```

The exact request/response schemas and status behavior are normative in Section 17.9. Keep domain logic out of route handlers.

---

## 15. Error and Edge-Case Requirements

### 15.1 Goal parsing failure
- Ask the user to rephrase or fill missing fields manually.
- Preserve already-valid fields.

### 15.2 Gonka unavailable
- Show clear “AI review unavailable” state.
- Do not fall back to OpenAI/another centralized model.
- Do not allow trade execution without GoalGuard approval.

### 15.3 Council disagreement
- Show `Disputed`.
- Surface exactly which role disagreed and its short reason.
- Block execution in P0.

### 15.4 No suitable live options
- Do not fabricate.
- Explain why no candidate meets the goal.
- Allow user to loosen deadline/loss/premium constraints.

### 15.5 Live order changes before execution
- Re-fetch/revalidate before signing.
- If price/order changed materially, invalidate the old confirmation and show a new preview.

### 15.6 Wrong network
- Prompt user to switch to Base.
- Never submit on an unintended chain.

### 15.7 Insufficient balance
- Explain whether gas token or premium/settlement token is missing.

### 15.8 User rejects wallet signature
- Return to confirmation state without marking the goal protected.

### 15.9 Transaction failure
- Show failed status and transaction hash if available.
- Do not mark goal protected.

### 15.10 Deadline has no matching expiry
- Prefer the nearest valid expiry on or after the deadline when reasonable.
- Show the mismatch clearly.
- If gap exceeds the configured threshold, reject the candidate.

---

## 16. Safety and Financial Guardrails

1. **No autonomous P0 execution.** Every trade needs explicit confirmation.
2. **No LLM-generated financial numbers.** All numbers come from live protocol data + deterministic code.
3. **Council disagreement blocks execution.**
4. **Live trade premium cap enabled by default.**
5. **Use a fresh/burner wallet for hackathon execution.**
6. **Never commit secrets/private keys.**
7. **Never expose server API keys to the client.**
8. **Use exact approvals where possible.**
9. **Preview/dry-run before live execution where supported.**
10. **Revalidate live order state immediately before signing.**
11. **Show maximum known premium loss before confirmation.**
12. **Do not claim a guaranteed outcome beyond the actual option payoff.**
13. **Record model/request IDs for auditability.**
14. **Do not expose private chain-of-thought.** Show concise reasons/evidence only.

---

## 17. Canonical Data Contracts & Database Schema

This section is normative. Frontend state, backend services, persistence, tests, and API payloads must derive from these contracts. If an abbreviated interface elsewhere in this PRD differs from this section, this section wins.

### 17.0 P0 implementation decisions (2026-09-01)

These decisions are normative and override older abbreviated examples in this PRD:

- `ProtectionCandidate` remains the internal/persistence entity. Public candidate responses use `PublicProtectionCandidate = Omit<ProtectionCandidate, "protocolRaw">`; unknown fields remain rejected.
- `TradePreview` additionally returns `walletReadiness` for gas, settlement token, and underlying ETH exposure, plus a `referralDisclosure`. Each readiness item contains a symbol, balance and requirement as base-unit strings, and `sufficient`.
- Canonical errors additionally include `INSUFFICIENT_EXPOSURE` and `TRADE_MONITOR_UNAVAILABLE`.
- PostgreSQL persistence adds internal `goals.owner_session_hash`; expected execution target/calldata hash/value and verification deadline on `trades`; receipt verification fields on `trades`; council `input_hash`; and a `worker_heartbeats` table. These fields are server-only and do not change the public entity schema version.
- P0 ownership is an anonymous random 256-bit HttpOnly, Secure-in-production, SameSite=Lax session cookie. Only its SHA-256 hash is stored. User-facing ownership mismatches return `404`.
- Mutations require an exact `Origin` match with `NEXT_PUBLIC_APP_URL`. Trade execution and submission also require an `Idempotency-Key`.
- Supabase PostgreSQL is authoritative. Vercel uses the transaction pooler with prepared statements disabled; migrations use `DATABASE_DIRECT_URL`; PGlite is the credential-free repository-test adapter.
- Vercel hosts the UI and API routes. One Render worker writes a 15-second heartbeat and verifies submitted Base transactions and Thetanuts buyer positions. Signing preparation stops with `503 TRADE_MONITOR_UNAVAILABLE` when the heartbeat is older than 45 seconds.
- Primary approved-state UI wording is “Council checks passed.” A confirmed result is “Protection position active,” not a guarantee that the real-world goal cannot lose value.

### 17.1 Contract ownership and naming rules

Create one shared contract package and import it everywhere:

```text
/lib/contracts/enums.ts
/lib/contracts/scalars.ts
/lib/contracts/entities.ts
/lib/contracts/api.ts
/lib/contracts/errors.ts
/lib/contracts/db-mappers.ts
```

Rules:

1. JSON, TypeScript, and frontend fields use `camelCase`.
2. Database tables and columns use `snake_case`.
3. Conversion between them occurs only in `db-mappers.ts`; route handlers and UI code never use database column names.
4. IDs are UUID v4 strings generated by the backend. Protocol IDs remain strings because they may not be UUIDs.
5. Calendar dates use `YYYY-MM-DD`. Timestamps use UTC ISO 8601, for example `2026-09-30T12:30:00.000Z`.
6. Monetary values, token quantities, strikes, and prices cross API boundaries as decimal strings, never JavaScript floating-point numbers.
7. Percentages used for rules are integer basis points: `500` means 5.00%; `10000` means 100.00%.
8. Raw blockchain quantities use base-unit integer strings. Display quantities use decimal strings and must include token decimals/address metadata.
9. Entity response fields that may be absent are present with `null`. Arrays are present as `[]`, never `null`. Request-only optional properties may be omitted.
10. Unknown extra properties are rejected at API boundaries. Persistence records carry `schemaVersion: 1`.
11. Raw Gonka responses and protocol payloads may be stored for debugging, but public API responses return only the allowlisted summaries defined here.

### 17.2 Canonical scalar types

```ts
export type UUID = string;              // UUID v4
export type ISODate = string;           // YYYY-MM-DD
export type ISODateTime = string;       // UTC ISO 8601
export type DecimalString = string;     // /^(0|[1-9]\d*)(\.\d+)?$/
export type BaseUnitString = string;    // /^(0|[1-9]\d*)$/
export type EvmAddress = `0x${string}`; // 20-byte address; validate checksum/length
export type TxHash = `0x${string}`;     // 32-byte hash

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };
```

`DecimalString` values must be normalized without commas, currency symbols, exponent notation, leading `+`, or unnecessary leading zeroes. Values that can be negative, such as an option payoff after cost, use `SignedDecimalString`, which permits one leading `-`.

```ts
export type SignedDecimalString = string; // /^-?(0|[1-9]\d*)(\.\d+)?$/
```

### 17.3 Canonical enums

These string values are closed sets. Do not introduce synonyms in individual layers.

```ts
export type GoalType =
  | "rent"
  | "tuition"
  | "travel"
  | "emergency"
  | "custom";

export type SupportedAsset = "ETH";

export type GoalStatus =
  | "draft"
  | "searching"
  | "reviewing"
  | "ready"
  | "protected"
  | "failed";

export type CandidateSource = "optionbook" | "optionfactory";
export type OptionType = "put";
export type CandidateStatus = "viable" | "rejected" | "selected" | "stale";

export type CouncilRole =
  | "strategist"
  | "risk_auditor"
  | "consumer_advocate";

export type CouncilVerdict = "approve" | "reject" | "uncertain";
export type CouncilStatus = "approved" | "disputed" | "blocked";

export type InferencePurpose =
  | "goal_parse"
  | "strategist_review"
  | "risk_auditor_review"
  | "consumer_advocate_review";

export type InferenceStatus = "succeeded" | "failed";

export type TradeStatus =
  | "previewed"
  | "awaiting_signature"
  | "submitted"
  | "confirmed"
  | "failed"
  | "cancelled"
  | "stale";
```

### 17.4 Canonical entity contracts

P0 deliberately has no `User` entity or custodial account model. Goal ownership is limited to the current browser/session and the connected wallet is recorded only on a trade. The deployed hackathon build must not expose list-all-records APIs. Production multi-user deployment requires authentication and an ownership foreign key before launch; do not improvise that field independently in frontend or backend code.

#### 17.4.1 Goal

```ts
export interface Goal {
  schemaVersion: 1;
  id: UUID;
  goalType: GoalType;
  customGoalLabel: string | null;
  underlyingAsset: SupportedAsset;
  protectedValueUsd: DecimalString;
  deadline: ISODate;
  maxLossBps: number;
  maxPremiumUsd: DecimalString | null;
  originalUserMessage: string;
  status: GoalStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;

  // Read-model references derived from related records; not stored on goals.
  parseInferenceId: UUID | null;
  selectedCandidateId: UUID | null;
  councilDecisionId: UUID | null;
  tradeId: UUID | null;
}
```

Constraints:

- `protectedValueUsd > 0`.
- `maxLossBps` is an integer from `0` through `9999`.
- `deadline` must be later than the goal creation date when the goal becomes `searching`.
- `customGoalLabel` is required and 1–80 characters only when `goalType = "custom"`; otherwise it is `null`.
- `maxPremiumUsd` is `null` or greater than `0`.
- `originalUserMessage` is 1–4000 characters.
- `protected` requires at least one related confirmed trade. `ready` requires a selected viable candidate and an approved council decision.

#### 17.4.2 Protection candidate and scenarios

```ts
export interface ScenarioResult {
  key: "down" | "flat" | "up" | "custom";
  settlementPriceUsd: DecimalString;
  underlyingValueUsd: DecimalString;
  optionPayoffUsd: DecimalString;
  premiumCostUsd: DecimalString;
  netProtectedValueUsd: SignedDecimalString;
}

export interface ProtectionCandidate {
  schemaVersion: 1;
  id: UUID;
  goalId: UUID;
  source: CandidateSource;
  protocolOrderId: string | null;
  underlyingAsset: SupportedAsset;
  optionType: OptionType;
  strikeUsd: DecimalString;
  expiry: ISODateTime;
  settlementTokenAddress: EvmAddress;
  settlementTokenSymbol: string;
  settlementTokenDecimals: number;
  premiumAmountBaseUnits: BaseUnitString;
  premiumUsd: DecimalString;
  quantityBaseUnits: BaseUnitString;
  quantityUnderlying: DecimalString;
  maxPremiumLossUsd: DecimalString;
  estimatedFloorUsd: DecimalString;
  deadlineGapHours: number;
  goalCoverageBps: number;
  availableQuantityBaseUnits: BaseUnitString | null;
  status: CandidateStatus;
  rejectionReasons: string[];
  protocolRaw: JsonValue;
  scenarios: ScenarioResult[];
  marketAsOf: ISODateTime;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
```

Constraints:

- Positive decimal values are required for strike, premium, quantity, and estimated floor.
- `settlementTokenDecimals` is an integer from `0` through `255`.
- `deadlineGapHours` is a non-negative integer; candidate expiry must be on or after the goal deadline in P0.
- `goalCoverageBps` is an integer from `0` through `10000`.
- `rejectionReasons` is empty unless status is `rejected` or `stale`.
- `selected` is unique per goal. Selecting one candidate atomically demotes any previous selection to `viable` or `stale`.
- At least the `down`, `flat`, and `up` scenario keys must be present exactly once.
- `protocolOrderId` is required for `optionbook`; it may be `null` for an uncreated `optionfactory` quote.
- `marketAsOf` is the timestamp of the live data used to calculate the candidate. Execution must reject a stale candidate according to the configured quote-validity window.

#### 17.4.3 Gonka inference

```ts
export interface GonkaInference {
  schemaVersion: 1;
  id: UUID;
  goalId: UUID | null;
  candidateId: UUID | null;
  purpose: InferencePurpose;
  provider: "gonka";
  model: string;
  requestId: string | null;
  status: InferenceStatus;
  inputHash: string;
  latencyMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: ISODateTime;
  completedAt: ISODateTime | null;
}
```

Constraints:

- `requestId` is globally unique and non-empty when Gonka returns one. It may be `null` only when the upstream call fails before Gonka assigns/returns an ID.
- `inputHash` is a lowercase SHA-256 hex digest of the normalized inference input. Do not store secrets in the hashed input source.
- Review purposes require both `goalId` and `candidateId`; `goal_parse` may have both as `null` until parsing produces a complete goal.
- `succeeded` requires a non-null `requestId`, `completedAt`, and null error fields. `failed` requires `errorCode` and `errorMessage`.
- Public APIs never return raw prompts, credentials, private reasoning, or raw model chain-of-thought.

#### 17.4.4 Council decision and review

```ts
export interface CouncilReview {
  schemaVersion: 1;
  id: UUID;
  decisionId: UUID;
  inferenceId: UUID;
  role: CouncilRole;
  model: string;
  requestId: string;
  verdict: CouncilVerdict;
  confidenceBps: number;
  summary: string;
  concerns: string[];
  requiredDisclosures: string[];
  createdAt: ISODateTime;
}

export interface CouncilDecision {
  schemaVersion: 1;
  id: UUID;
  goalId: UUID;
  candidateId: UUID;
  attempt: number;
  status: CouncilStatus;
  rulesetVersion: string;
  approvedReviewCount: number;
  rejectedReviewCount: number;
  uncertainReviewCount: number;
  blockedReasons: string[];
  reviews: CouncilReview[];
  createdAt: ISODateTime;
}
```

Constraints:

- Each decision has exactly one review for each of the three council roles.
- `(decisionId, role)` and `inferenceId` are unique.
- `confidenceBps` is an integer from `0` through `10000`.
- `summary` is 1–1000 characters; each concern/disclosure is 1–500 characters.
- The three count fields must equal the review verdict counts and sum to `3`.
- `approved` requires three approvals, no deterministic validation failure, and an empty `blockedReasons` array.
- `disputed` means at least one `uncertain` and no `reject`. `blocked` means at least one `reject` or a deterministic hard-constraint failure.
- `(candidateId, attempt)` is unique. `attempt` starts at `1` and increments for an explicit re-review.

#### 17.4.5 Trade

```ts
export interface Trade {
  schemaVersion: 1;
  id: UUID;
  goalId: UUID;
  candidateId: UUID;
  councilDecisionId: UUID;
  idempotencyKey: string;
  walletAddress: EvmAddress;
  chainId: 8453;
  status: TradeStatus;
  quoteFingerprint: string;
  previewExpiresAt: ISODateTime;
  settlementTokenAddress: EvmAddress;
  premiumAmountBaseUnits: BaseUnitString;
  premiumUsd: DecimalString;
  txHash: TxHash | null;
  protocolPositionId: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  submittedAt: ISODateTime | null;
  confirmedAt: ISODateTime | null;
}
```

Constraints:

- `idempotencyKey` is 16–128 characters and globally unique. Reusing it with the same payload returns the original trade; reusing it with a different payload returns `409 IDEMPOTENCY_CONFLICT`.
- `chainId` must equal `8453` in P0.
- The referenced council decision must be `approved`, belong to the same goal/candidate, and remain current.
- `premiumUsd` must not exceed `MAX_LIVE_TRADE_PREMIUM_USD` when live execution is enabled.
- `submitted` and `confirmed` require a unique `txHash`. `confirmed` additionally requires `confirmedAt`.
- `failed` requires `failureCode` and `failureMessage`; every other status keeps both failure fields `null`.
- A goal becomes `protected` only after a related trade becomes `confirmed`.

### 17.5 Relationships and lifecycle

```text
Goal 1 ─── * ProtectionCandidate
  │                 │
  │                 └── 1 ─── * CouncilDecision (re-review attempts)
  │                                  │
  │                                  └── 1 ─── 3 CouncilReview
  │                                                   │
  ├── * GonkaInference <──────────────────────────────┘
  │
  └── * Trade ─── 1 selected ProtectionCandidate
             └── 1 approved CouncilDecision
```

Lifecycle rules:

1. Parsing may produce an incomplete `GoalDraft`; a `Goal` is persisted only when all required fields validate.
2. Candidate generation moves the goal to `searching`; council evaluation moves it to `reviewing`.
3. A selected candidate plus approved decision moves the goal to `ready`.
4. A preview creates a trade in `previewed`; validated execution preparation changes it to `awaiting_signature`.
5. Wallet submission changes the trade to `submitted`; confirmed receipt changes it to `confirmed` and the goal to `protected` in one transaction.
6. Candidate staleness, order changes, or quote expiry invalidates the preview and requires a new user confirmation.
7. Records used for an executed trade are immutable except for status/timestamp fields required to record submission and confirmation.

### 17.6 Reference relational schema

Use these exact logical tables whether the implementation uses PostgreSQL, SQLite, or an equivalent lightweight store. Database-specific migration syntax may differ, but field meaning and constraints may not.

#### `goals`

| Column | Type | Null | Constraints |
|---|---|---:|---|
| `id` | UUID/TEXT | No | Primary key |
| `schema_version` | INTEGER | No | Default `1`, check `= 1` |
| `goal_type` | ENUM/TEXT | No | `GoalType` |
| `custom_goal_label` | VARCHAR(80) | Yes | Required only for `custom` |
| `underlying_asset` | ENUM/TEXT | No | `ETH` |
| `protected_value_usd` | DECIMAL/TEXT | No | `> 0` |
| `deadline` | DATE/TEXT | No | ISO date |
| `max_loss_bps` | INTEGER | No | `0..9999` |
| `max_premium_usd` | DECIMAL/TEXT | Yes | `> 0` when present |
| `original_user_message` | VARCHAR(4000) | No | Non-empty |
| `status` | ENUM/TEXT | No | `GoalStatus` |
| `created_at` | TIMESTAMP/TEXT | No | UTC |
| `updated_at` | TIMESTAMP/TEXT | No | UTC |

Indexes: `(status, updated_at)` and `(deadline)`.

#### `protection_candidates`

| Column | Type | Null | Constraints |
|---|---|---:|---|
| `id` | UUID/TEXT | No | Primary key |
| `goal_id` | UUID/TEXT | No | FK `goals.id` on delete cascade |
| `schema_version` | INTEGER | No | Default `1` |
| `source` | ENUM/TEXT | No | `CandidateSource` |
| `protocol_order_id` | TEXT | Yes | Required for OptionBook |
| `underlying_asset` | ENUM/TEXT | No | `ETH` |
| `option_type` | ENUM/TEXT | No | `put` |
| `strike_usd` | DECIMAL/TEXT | No | `> 0` |
| `expiry` | TIMESTAMP/TEXT | No | UTC |
| `settlement_token_address` | CHAR(42)/TEXT | No | Valid EVM address |
| `settlement_token_symbol` | VARCHAR(16) | No | Non-empty |
| `settlement_token_decimals` | INTEGER | No | `0..255` |
| `premium_amount_base_units` | NUMERIC(78,0)/TEXT | No | `>= 0` |
| `premium_usd` | DECIMAL/TEXT | No | `> 0` |
| `quantity_base_units` | NUMERIC(78,0)/TEXT | No | `> 0` |
| `quantity_underlying` | DECIMAL/TEXT | No | `> 0` |
| `max_premium_loss_usd` | DECIMAL/TEXT | No | `> 0` |
| `estimated_floor_usd` | DECIMAL/TEXT | No | `>= 0` |
| `deadline_gap_hours` | INTEGER | No | `>= 0` |
| `goal_coverage_bps` | INTEGER | No | `0..10000` |
| `available_quantity_base_units` | NUMERIC(78,0)/TEXT | Yes | `>= 0` |
| `status` | ENUM/TEXT | No | `CandidateStatus` |
| `rejection_reasons_json` | JSON/JSONB | No | String array, default `[]` |
| `protocol_raw_json` | JSON/JSONB | No | Valid JSON |
| `scenarios_json` | JSON/JSONB | No | `ScenarioResult[]` contract |
| `market_as_of` | TIMESTAMP/TEXT | No | UTC |
| `created_at` | TIMESTAMP/TEXT | No | UTC |
| `updated_at` | TIMESTAMP/TEXT | No | UTC |

Indexes: `(goal_id, status)`, `(expiry)`, and `(source, protocol_order_id)`. Add a partial unique index on `goal_id` where `status = 'selected'` when supported.

#### `gonka_inferences`

| Column | Type | Null | Constraints |
|---|---|---:|---|
| `id` | UUID/TEXT | No | Primary key |
| `goal_id` | UUID/TEXT | Yes | FK `goals.id` on delete set null |
| `candidate_id` | UUID/TEXT | Yes | FK `protection_candidates.id` on delete set null |
| `schema_version` | INTEGER | No | Default `1` |
| `purpose` | ENUM/TEXT | No | `InferencePurpose` |
| `provider` | TEXT | No | Check `= 'gonka'` |
| `model` | TEXT | No | Non-empty |
| `request_id` | TEXT | Yes | Unique when present; null only if upstream fails before returning an ID |
| `status` | ENUM/TEXT | No | `InferenceStatus` |
| `input_hash` | CHAR(64)/TEXT | No | Lowercase SHA-256 hex |
| `latency_ms` | INTEGER | Yes | `>= 0` |
| `error_code` | TEXT | Yes | Required on failure |
| `error_message` | TEXT | Yes | Required on failure |
| `raw_response_json` | JSON/JSONB | Yes | Server-only; never public |
| `created_at` | TIMESTAMP/TEXT | No | UTC |
| `completed_at` | TIMESTAMP/TEXT | Yes | Required on success |

Indexes: `(goal_id, purpose, created_at)` and `(candidate_id, purpose)`. Add a unique index on `request_id` where not null.

#### `council_decisions`

| Column | Type | Null | Constraints |
|---|---|---:|---|
| `id` | UUID/TEXT | No | Primary key |
| `goal_id` | UUID/TEXT | No | FK `goals.id` on delete cascade |
| `candidate_id` | UUID/TEXT | No | FK `protection_candidates.id` on delete cascade |
| `schema_version` | INTEGER | No | Default `1` |
| `attempt` | INTEGER | No | `>= 1`; unique with candidate |
| `status` | ENUM/TEXT | No | `CouncilStatus` |
| `ruleset_version` | VARCHAR(32) | No | Non-empty |
| `approved_review_count` | INTEGER | No | `0..3` |
| `rejected_review_count` | INTEGER | No | `0..3` |
| `uncertain_review_count` | INTEGER | No | `0..3` |
| `blocked_reasons_json` | JSON/JSONB | No | String array, default `[]` |
| `created_at` | TIMESTAMP/TEXT | No | UTC |

Unique constraint: `(candidate_id, attempt)`. Indexes: `(goal_id, created_at)` and `(candidate_id, created_at)`.

#### `council_reviews`

| Column | Type | Null | Constraints |
|---|---|---:|---|
| `id` | UUID/TEXT | No | Primary key |
| `decision_id` | UUID/TEXT | No | FK `council_decisions.id` on delete cascade |
| `inference_id` | UUID/TEXT | No | FK `gonka_inferences.id`, unique |
| `schema_version` | INTEGER | No | Default `1` |
| `role` | ENUM/TEXT | No | `CouncilRole`; unique with decision |
| `model` | TEXT | No | Must equal linked inference model |
| `request_id` | TEXT | No | Must equal linked inference request ID |
| `verdict` | ENUM/TEXT | No | `CouncilVerdict` |
| `confidence_bps` | INTEGER | No | `0..10000` |
| `summary` | VARCHAR(1000) | No | Non-empty |
| `concerns_json` | JSON/JSONB | No | String array, default `[]` |
| `required_disclosures_json` | JSON/JSONB | No | String array, default `[]` |
| `created_at` | TIMESTAMP/TEXT | No | UTC |

Unique constraint: `(decision_id, role)`. Index: `(decision_id)`.

#### `trades`

| Column | Type | Null | Constraints |
|---|---|---:|---|
| `id` | UUID/TEXT | No | Primary key |
| `goal_id` | UUID/TEXT | No | FK `goals.id` on delete restrict |
| `candidate_id` | UUID/TEXT | No | FK `protection_candidates.id` on delete restrict |
| `council_decision_id` | UUID/TEXT | No | FK `council_decisions.id` on delete restrict |
| `schema_version` | INTEGER | No | Default `1` |
| `idempotency_key` | VARCHAR(128) | No | Unique |
| `wallet_address` | CHAR(42)/TEXT | No | Valid EVM address |
| `chain_id` | INTEGER | No | Check `= 8453` |
| `status` | ENUM/TEXT | No | `TradeStatus` |
| `quote_fingerprint` | CHAR(64)/TEXT | No | Lowercase SHA-256 hex |
| `preview_expires_at` | TIMESTAMP/TEXT | No | UTC |
| `settlement_token_address` | CHAR(42)/TEXT | No | Valid EVM address |
| `premium_amount_base_units` | NUMERIC(78,0)/TEXT | No | `>= 0` |
| `premium_usd` | DECIMAL/TEXT | No | `> 0` |
| `tx_hash` | CHAR(66)/TEXT | Yes | Unique when present |
| `protocol_position_id` | TEXT | Yes | Protocol-provided value |
| `failure_code` | TEXT | Yes | Required on failure |
| `failure_message` | TEXT | Yes | Required on failure |
| `created_at` | TIMESTAMP/TEXT | No | UTC |
| `updated_at` | TIMESTAMP/TEXT | No | UTC |
| `submitted_at` | TIMESTAMP/TEXT | Yes | Required when submitted/confirmed |
| `confirmed_at` | TIMESTAMP/TEXT | Yes | Required when confirmed |

Indexes: `(goal_id, created_at)`, `(wallet_address, created_at)`, `(status, updated_at)`, and unique `(tx_hash)` where not null.

### 17.7 Deletion, retention, and mutation rules

- During P0, expose no hard-delete endpoint for financial/audit records.
- A draft goal with no trade may be deleted internally with cascading candidates/decisions/reviews; associated inference records retain redacted audit metadata with nullable foreign keys.
- Goals with any `submitted` or `confirmed` trade cannot be hard-deleted. A future production privacy workflow may redact user text while retaining required transaction/audit facts.
- `protocolRaw` and raw Gonka response retention should be configurable and excluded from client logs, analytics, and public API responses.
- Every state transition updates `updatedAt` in the same transaction as the underlying change.

### 17.8 API conventions

- Base path: `/api`.
- Request and response body content type: `application/json`.
- Successful mutation responses use HTTP `200` unless a new durable record is first created, in which case `201` is allowed.
- Validation errors use `400`; missing records `404`; stale state or idempotency conflicts `409`; live quote expiry `410`; safety/eligibility blocks `422`; upstream Gonka/Thetanuts failures `502`; temporary unavailability `503`.
- Each response includes `requestId`, generated by GoalGuard for application tracing. Gonka Request IDs remain separate fields.
- Mutating trade requests require an `Idempotency-Key` header. The same key and payload must return the same result.
- Wallet addresses are normalized to a validated checksum form for API responses and a canonical lowercase form for equality checks/indexing.

```ts
export interface ApiMeta {
  requestId: string;
  timestamp: ISODateTime;
}

export interface ApiErrorResponse {
  error: {
    code:
      | "VALIDATION_ERROR"
      | "NOT_FOUND"
      | "CONFLICT"
      | "IDEMPOTENCY_CONFLICT"
      | "GOAL_INCOMPLETE"
      | "NO_SUITABLE_CANDIDATE"
      | "COUNCIL_NOT_APPROVED"
      | "CANDIDATE_STALE"
      | "QUOTE_EXPIRED"
      | "EXECUTION_DISABLED"
      | "TRADE_CAP_EXCEEDED"
      | "WRONG_NETWORK"
      | "INSUFFICIENT_BALANCE"
      | "GONKA_UNAVAILABLE"
      | "THETANUTS_UNAVAILABLE"
      | "UPSTREAM_INVALID_RESPONSE"
      | "INTERNAL_ERROR";
    message: string;
    retryable: boolean;
    fieldErrors: Record<string, string[]>;
    details: JsonValue | null;
  };
  meta: ApiMeta;
}
```

`fieldErrors` is `{}` for non-field errors. Error `details` must not contain secrets, raw prompts, private reasoning, or unfiltered upstream payloads.

### 17.9 Exact API request and response contracts

#### 17.9.1 `POST /api/goals/parse`

Parses or refines a draft. It persists a `Goal` only after all required fields validate.

```ts
export type GoalDraftField =
  | "goalType"
  | "customGoalLabel"
  | "underlyingAsset"
  | "protectedValueUsd"
  | "deadline"
  | "maxLossBps"
  | "maxPremiumUsd";

export interface GoalDraft {
  goalType?: GoalType;
  customGoalLabel?: string | null;
  underlyingAsset?: SupportedAsset;
  protectedValueUsd?: DecimalString;
  deadline?: ISODate;
  maxLossBps?: number;
  maxPremiumUsd?: DecimalString | null;
}

export interface ParseGoalRequest {
  message: string;                  // 1..4000 characters
  draft?: GoalDraft;               // previously confirmed/extracted values
  locale?: string;                 // BCP 47; default "en"
  timezone?: string;               // IANA name; required for relative dates
}

export interface InferenceSummary {
  id: UUID;
  purpose: InferencePurpose;
  model: string;
  requestId: string | null;
  status: InferenceStatus;
}

export interface ParseGoalResponse {
  data: {
    draft: GoalDraft;
    missingFields: GoalDraftField[];
    clarificationQuestion: string | null;
    goal: Goal | null;
    inference: InferenceSummary;
  };
  meta: ApiMeta;
}
```

Behavior:

- Complete, valid parse: `goal` is non-null, `missingFields` is `[]`, and `clarificationQuestion` is `null`.
- Incomplete parse: HTTP `200`, `goal` is `null`, and exactly one concise `clarificationQuestion` is returned.
- Gonka failure: `502 GONKA_UNAVAILABLE`; do not silently use another provider.

#### 17.9.2 `POST /api/protection/candidates`

```ts
export interface GenerateCandidatesRequest {
  goalId: UUID;
  refresh?: boolean; // default false; true forces new live market read
}

export interface CandidateRejection {
  protocolOrderId: string | null;
  reasons: string[];
}

export interface GenerateCandidatesResponse {
  data: {
    goal: Goal;
    candidates: ProtectionCandidate[]; // viable/selected candidates only, ranked
    selectedCandidateId: UUID | null;
    rejected: CandidateRejection[];
    marketAsOf: ISODateTime;
  };
  meta: ApiMeta;
}
```

Behavior:

- Response order is deterministic best-to-worst according to Section 10.6.
- Backend persists evaluated candidates and atomically marks at most one `selected`.
- No viable candidate: `422 NO_SUITABLE_CANDIDATE` with safe rejection summaries in `error.details`; never fabricate an option.
- A repeated request may return non-stale cached results unless `refresh = true`.

#### 17.9.3 `POST /api/council/review`

```ts
export interface ReviewCandidateRequest {
  goalId: UUID;
  candidateId: UUID;
  forceNewAttempt?: boolean; // default false
}

export interface ReviewCandidateResponse {
  data: {
    goal: Goal;
    candidate: ProtectionCandidate;
    decision: CouncilDecision;
    inferences: InferenceSummary[]; // exactly 3 on a completed attempt
  };
  meta: ApiMeta;
}
```

Behavior:

- The goal and candidate IDs must match; otherwise return `404 NOT_FOUND` without revealing cross-record data.
- Reviews run independently. The final decision is computed only after all three valid structured reviews are available.
- Unless `forceNewAttempt = true`, return the latest completed attempt for an unchanged candidate/input hash.
- Upstream/structured-output failure returns `502`; no partially completed decision can be `approved`.
- A `disputed` or `blocked` decision is a successful `200` domain result, not an HTTP error.

#### 17.9.4 `POST /api/trades/preview`

```ts
export interface PreviewTradeRequest {
  goalId: UUID;
  candidateId: UUID;
  councilDecisionId: UUID;
  walletAddress: EvmAddress;
}

export interface AllowanceRequirement {
  tokenAddress: EvmAddress;
  spenderAddress: EvmAddress;
  currentAmountBaseUnits: BaseUnitString;
  requiredAmountBaseUnits: BaseUnitString;
  approvalRequired: boolean;
}

export interface PreparedTransaction {
  chainId: 8453;
  to: EvmAddress;
  data: `0x${string}`;
  valueBaseUnits: BaseUnitString;
}

export interface TradePreview {
  trade: Trade;
  candidate: ProtectionCandidate;
  allowance: AllowanceRequirement | null;
  approvalTransaction: PreparedTransaction | null;
  executionTransaction: PreparedTransaction;
  estimatedGasBaseUnits: BaseUnitString | null;
  warnings: string[];
}

export interface PreviewTradeResponse {
  data: TradePreview;
  meta: ApiMeta;
}
```

Behavior:

- Requires an approved current decision and fresh candidate data.
- Re-fetches the live order and recalculates cost. Material change returns `409 CANDIDATE_STALE` and requires candidate regeneration/council review as applicable.
- Creates or replaces a `previewed` trade and returns exact approval only; unlimited approval is forbidden when exact approval is supported.
- `PreparedTransaction` is unsigned. The server never receives a private key.

#### 17.9.5 `POST /api/trades/execute`

This endpoint performs final server-side validation and returns an unsigned transaction for the connected browser wallet. It does not sign or broadcast on the user’s behalf.

Required header:

```text
Idempotency-Key: <16..128 character unique value>
```

```ts
export interface PrepareExecutionRequest {
  tradeId: UUID;
  quoteFingerprint: string;
  walletAddress: EvmAddress;
  chainId: 8453;
  userConfirmed: true;
}

export interface PrepareExecutionResponse {
  data: {
    trade: Trade; // status "awaiting_signature"
    approvalTransaction: PreparedTransaction | null;
    executionTransaction: PreparedTransaction;
  };
  meta: ApiMeta;
}
```

Behavior:

- Reject if live execution flag is false, the quote expired, council is not approved, candidate/order changed, wallet/network differs, or safety cap is exceeded.
- The frontend may first submit `approvalTransaction` through the wallet, wait for confirmation, then submit `executionTransaction`.
- Returning this response does not mean the trade executed. UI must say “Awaiting wallet signature,” not “Protected.”

#### 17.9.6 `POST /api/trades/{tradeId}/submission`

Records the hash only after the connected wallet broadcasts the execution transaction.

```ts
export interface RecordSubmissionRequest {
  txHash: TxHash;
  walletAddress: EvmAddress;
}

export interface RecordSubmissionResponse {
  data: {
    trade: Trade; // status "submitted" or already "confirmed"
  };
  meta: ApiMeta;
}
```

The backend verifies the transaction chain, sender, destination, and calldata/fingerprint before accepting it. A client-provided hash alone is never proof of protection.

#### 17.9.7 `GET /api/trades/{tradeId}`

```ts
export interface GetTradeResponse {
  data: {
    trade: Trade;
    receipt: {
      blockNumber: BaseUnitString;
      success: boolean;
      confirmations: number;
      explorerUrl: string;
    } | null;
  };
  meta: ApiMeta;
}
```

The backend derives status from the Base RPC/protocol position. Only a verified successful receipt/position may transition the trade to `confirmed` and the goal to `protected`.

#### 17.9.8 `GET /api/goals/{goalId}`

```ts
export interface GetGoalResponse {
  data: {
    goal: Goal;
    selectedCandidate: ProtectionCandidate | null;
    councilDecision: CouncilDecision | null;
    trade: Trade | null;
  };
  meta: ApiMeta;
}
```

This is the canonical hydration response for frontend refresh/recovery. It prevents the UI from reconstructing state independently from multiple local objects.

### 17.10 Persistence adapters

P0 may begin with an in-memory or local adapter, but it must implement the same repository interface and constraints as the relational model:

```ts
export interface GoalGuardRepository {
  createGoal(goal: Goal): Promise<Goal>;
  getGoal(id: UUID): Promise<Goal | null>;
  updateGoalStatus(id: UUID, status: GoalStatus): Promise<Goal>;
  replaceCandidates(goalId: UUID, candidates: ProtectionCandidate[]): Promise<void>;
  getCandidate(id: UUID): Promise<ProtectionCandidate | null>;
  saveInference(inference: GonkaInference): Promise<void>;
  saveDecision(decision: CouncilDecision): Promise<void>;
  getLatestDecision(candidateId: UUID): Promise<CouncilDecision | null>;
  createTrade(trade: Trade): Promise<Trade>;
  getTrade(id: UUID): Promise<Trade | null>;
  transitionTrade(id: UUID, from: TradeStatus[], to: TradeStatus): Promise<Trade>;
}
```

Do not create separate frontend-only versions of these entities. Frontend view models may add presentation fields, but their source entity must remain nested and unchanged.

### 17.11 Transactional invariants and concurrency

- Candidate selection, council decision persistence, and the corresponding goal status update are atomic.
- Trade creation is guarded by the unique idempotency key and a lock/compare-and-swap on the selected candidate.
- Before moving to `awaiting_signature`, compare the stored quote fingerprint and preview expiry with a freshly validated protocol quote.
- `submitted -> confirmed` and `goal -> protected` occur atomically after receipt/position verification.
- State transitions are forward-only except `previewed/awaiting_signature -> stale` and retry creation as a new trade record.
- Never overwrite a transaction hash, Gonka Request ID, executed candidate snapshot, or completed council review.

### 17.12 Required contract tests

- Every API example validates against the shared request/response schema.
- Database mapper round-trip preserves every canonical field.
- Decimal strings and base-unit strings reject floats, exponent notation, NaN, and negative values where prohibited.
- Enum values reject unknown strings.
- Exactly three unique council roles are required for a completed decision.
- An approved decision cannot be persisted with any non-approve review.
- A trade cannot be prepared from mismatched goal/candidate/decision IDs.
- Duplicate execution with one idempotency key cannot create a second trade.
- A client-reported transaction hash cannot mark a goal protected without verified on-chain success.
- Null and omitted-field behavior matches Sections 17.1 and 17.9.

---

## 18. Team Ownership

### Person A — AI / Backend
Owns:

- Gonka Router integration;
- goal parsing;
- GoalGuard prompts;
- structured AI schemas;
- request ID capture;
- consensus engine;
- AI error handling.

Definition of done:

```text
Natural-language goal
        -> GoalDraft / Goal
        -> 3 independent council reviews
        -> deterministic CouncilDecision
```

### Person B — Blockchain / Strategy
Owns:

- Base RPC integration;
- Thetanuts SDK client;
- market/order retrieval;
- option filtering;
- deterministic payoff/scenario calculations;
- trade preview;
- wallet execution;
- transaction/position verification.

Definition of done:

```text
Goal
    -> live candidates
    -> deterministic candidate values
    -> preview
    -> real trade when enabled
```

### Person C — Product / Frontend
Owns:

- overall UI;
- chat flow;
- goal cards;
- protection-plan card;
- GoalGuard visualization;
- wallet UX integration with Person B;
- loading/error states;
- protected-goal success state;
- final polish.

Definition of done:

```text
User can complete the full happy path without seeing raw developer/protocol output.
```

### Shared responsibility

- integration contracts/types;
- end-to-end testing;
- README;
- architecture documentation;
- hackathon submission compliance.

---

## 19. Development Milestones

### M1 — Integration skeleton
- Next.js app boots.
- Gonka Router returns one successful response + Request ID.
- Thetanuts client reads live market/order data.
- Wallet can connect to Base.

**Gate:** do not build advanced UX before both sponsor integrations work independently.

### M2 — Goal engine
- Natural-language input -> valid canonical `Goal`.
- Missing-field follow-ups work.
- Goal confirmation/editing UI works.

### M3 — Strategy engine
- Live ETH put candidates available.
- Deterministic calculations implemented.
- Hard constraints filter candidates.
- Top candidate returned to frontend.

### M4 — GoalGuard
- Three roles implemented.
- At least two distinct Gonka models used.
- Request IDs captured.
- Deterministic consensus implemented.
- Disagreement blocks trade.

### M5 — Trade preview + execution
- Preview works.
- Revalidation works.
- Safety cap works.
- Live execution path implemented behind feature flag.
- Confirmed trade can be read/displayed.

### M6 — Product polish
- chat-led user experience;
- goal cards;
- council visualization;
- scenario explanation;
- polished success/error states.

### M7 — Submission readiness
- public repo clean;
- environment-variable documentation;
- setup instructions;
- AI tools declaration;
- Gonka integration documented;
- Thetanuts integration documented;
- no secrets in git history;
- live demo deployed.

---

## 20. Acceptance Criteria

### 20.1 Gonka acceptance

- [ ] Every AI reasoning step uses Gonka Router.
- [ ] Goal parsing returns a Gonka Request ID.
- [ ] GoalGuard uses at least two distinct Gonka models.
- [ ] Three role reviews are returned in structured format.
- [ ] Each review exposes its model and Request ID.
- [ ] Disagreement produces a visible non-approved state.
- [ ] No centralized fallback model silently replaces Gonka.

### 20.2 Thetanuts Track 01 acceptance

- [ ] App reads real Thetanuts market/order data.
- [ ] Protection candidate is based on actual available option data.
- [ ] Removing Thetanuts would break the core product functionality.
- [ ] User sees a real protocol-backed protection plan, not a mocked plan.
- [ ] Financial outputs are derived from live data and deterministic calculations.

### 20.3 Thetanuts Track 02 acceptance

- [ ] AI interprets a natural-language protection goal.
- [ ] AI reviews live option candidate data.
- [ ] User approves the final plan.
- [ ] A real Thetanuts trade can be executed through the implemented flow when enabled.
- [ ] Trade result is surfaced in GoalGuard.

### 20.4 Product acceptance

A user can complete this flow without understanding options jargon:

```text
“I need $1,200 for rent next month and can’t lose more than 5%.”
    -> structured goal
    -> live protection plan
    -> GoalGuard approval
    -> explicit user confirmation
    -> protocol trade
    -> Protected goal state
```

### 20.5 Safety acceptance

- [ ] No private key/API secret is committed or sent to the client.
- [ ] No trade executes without explicit user confirmation.
- [ ] Trade is revalidated before signing.
- [ ] Live trade cap is enforced.
- [ ] Council disagreement blocks execution.
- [ ] UI never claims guaranteed protection beyond actual option conditions.

---

## 21. Hackathon Compliance

The implementation must account for MUBA event rules:

- project/code must be created during the official hacking period;
- maintain clean public commit history;
- document all AI tools used;
- provide a live working product and repository;
- do not reuse a previously submitted hackathon project;
- one project may compete across multiple tracks;
- follow sponsor-specific requirements in addition to general rules.

### Mainnet rule ambiguity
The general MUBA rules state a restriction around mainnet deployment using real funds, while Thetanuts Track 02 explicitly requires a real live Base-mainnet trade.

**Action required before enabling live execution:** obtain explicit organizer/sponsor confirmation on the permitted Thetanuts live-trade flow and retain that confirmation.

Until confirmed:

```env
ENABLE_LIVE_THETANUTS_EXECUTION=false
```

---

## 22. Environment Configuration

Expected environment variables; exact names may change based on the current SDK implementation.

```env
# Gonka
GONKA_API_KEY=
GONKA_BASE_URL=
GONKA_STRATEGIST_MODEL=
GONKA_RISK_AUDITOR_MODEL=
GONKA_CONSUMER_ADVOCATE_MODEL=

# Base / Thetanuts
THETANUTS_RPC_URL=
THETANUTS_REFERRER_ADDRESS=
NEXT_PUBLIC_BASE_CHAIN_ID=8453

# Safety
ENABLE_LIVE_THETANUTS_EXECUTION=false
MAX_LIVE_TRADE_PREMIUM_USD=3
MAX_DEADLINE_GAP_HOURS=168

# Optional app config
NEXT_PUBLIC_APP_URL=

# Persistence
DATABASE_URL=
DATABASE_DIRECT_URL=

# Render trade monitor
TRADE_WORKER_NAME=trade-monitor
TRADE_WORKER_POLL_MS=5000
TRADE_WORKER_HEARTBEAT_MS=15000
```

Never place a server-side Gonka key or private signing key in a `NEXT_PUBLIC_*` variable.

---

## 23. Open Questions / Decisions to Resolve During Build

1. Which current Gonka model IDs are most reliable and sufficiently different for the council?
2. Which exact field/header carries the Gonka Request ID in the current API response?
3. Which ETH put markets currently have enough live Thetanuts liquidity for the demo?
4. What is the exact current SDK flow for preview + fill, based on the repository version used during the hackathon?
5. Which settlement token(s) are required for the chosen live option?
6. What deadline-to-expiry gap should be considered acceptable? Start with a configurable threshold.
7. What exact organizer-approved interpretation applies to Thetanuts’ required live mainnet trade?
8. If OptionBook has no suitable order, is OptionFactory/RFQ reliable enough to promote from P2 to P0?
9. Which Section 17.10 persistence adapter should P0 use? Default: lightweight SQLite for local/deployed single-instance use; use PostgreSQL when the deployment platform requires concurrent multi-instance access.

---

## 24. Codex Implementation Rules

When Codex uses this PRD:

1. **Do not invent undocumented Gonka or Thetanuts APIs.** Inspect the current official documentation/repository first.
2. **Treat the current Thetanuts repository as source of truth** if workshop slides differ from the code.
3. **Keep all financial math deterministic and unit-tested.**
4. **Never let LLM output directly populate protocol amounts without validation.**
5. **Keep sponsor integrations real from the beginning.** Do not build mocked integrations and leave them for the end.
6. **Use strong TypeScript types and schema validation** at every external boundary.
7. **Keep AI, strategy, execution, and UI modules separate.**
8. **Do not expand into P1/P2 until the P0 happy path works end to end.**
9. **Do not add another blockchain, custom token, or custom smart contract unless a P0 requirement cannot be met otherwise.**
10. **Do not enable live execution until the safety flag is explicitly switched on.**
11. **Preserve raw protocol data for debugging but never expose sensitive values.**
12. **Log Gonka Request IDs and transaction hashes for traceability.**
13. **Write tests for goal validation, candidate filtering, payoff calculations, consensus logic, and execution guards.**
14. **Prefer the simplest implementation that produces a reliable live demo.**

---

## 25. Definition of Done

GoalGuard is P0-complete when all of the following are true:

1. A user can describe a real-life goal in natural language.
2. Gonka converts it into structured protection constraints.
3. GoalGuard reads live Thetanuts options.
4. Deterministic code creates a valid downside-protection candidate.
5. GoalGuard independently reviews the candidate through Gonka using multiple models.
6. Request IDs and disagreements are visible.
7. A user can review the exact cost and limitations.
8. The trade execution flow is implemented and safely gated.
9. When live execution is permitted and enabled, a real Thetanuts trade succeeds.
10. The UI updates the goal to a real protected/position state backed by the transaction.
11. The entire flow works from the deployed web application without developer intervention.

---

## Source Constraints Used for This PRD

This PRD is based on the MUBA Hacks 2026 opening materials, the Gonka “AI for Society” challenge brief, and the Thetanuts MUBA workshop materials supplied for the hackathon.

Important sponsor constraints reflected here:

- Gonka requires all AI reasoning/verification to run through Gonka Router and encourages multi-model consensus, disagreement handling, and visible Request IDs.
- Thetanuts Track 01 requires meaningful dependence on on-chain options rather than a superficial SDK call.
- Thetanuts Track 02 requires an AI agent workflow that executes a real live options trade through Thetanuts.
- Thetanuts recommends small trade sizes, burner-wallet safety, and preview/dry-run behavior.
- MUBA allows one project to compete in multiple tracks.

Where exact SDK/API names are not guaranteed by the supplied challenge materials, the PRD deliberately instructs Codex to inspect the current official implementation rather than hardcode assumptions.
