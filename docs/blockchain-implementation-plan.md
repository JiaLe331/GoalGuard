# GoalGuard P0 Blockchain Implementation Plan

Status: approved design; implementation not started  
Primary owner: Person B — Blockchain / Strategy  
Last reviewed: 2026-09-01  
Target: complete the full hackathon-safe blockchain path without a time-based scope cut

## 1. Purpose and authority

This document is the execution plan for GoalGuard's Person B work. It is intended to be supplied to coding agents in separate chats so that each agent can implement one bounded branch without silently changing the product design.

Instruction precedence is:

1. The repository `AGENTS.md`.
2. `goalguard_prd.md`, especially Section 17.
3. This implementation plan.
4. Task-specific instructions supplied to an implementation agent.

If this plan requires a change to a normative Section 17 contract, the branch must update the PRD first and then update the shared Zod contracts, persistence mapping, tests, API, and UI together. An agent must not work around a PRD conflict silently.

This plan does not authorize a live transaction. Live execution remains disabled until the live-acceptance gate in Section 8 is explicitly satisfied.

### Progress ledger

The coordinating owner updates this ledger only after reviewing a merged branch.

| Task | Branch | Status |
|---|---|---|
| B1 SDK and dual RPC | `feat/blockchain-sdk-rpc` | Not started |
| B2 Coverage contracts | `feat/blockchain-coverage-contracts` | Not started |
| B3 Strategy engine | `feat/blockchain-strategy` | Not started |
| B4 Trade safety | `feat/blockchain-trade-safety` | Not started |
| B5 Chain audit | `feat/blockchain-chain-audit` | Not started |
| B6 Wallet recovery | `feat/blockchain-wallet-recovery` | Not started |
| B7 Monitor/finality | `feat/blockchain-monitor-finality` | Not started |
| B8 Cross-layer tests | `test/blockchain-end-to-end` | Not started |
| B9 Docs/runbook | `docs/blockchain-runbook` | Not started |
| Live acceptance | Operator procedure | Blocked until B1–B9 and written authorization |

## 2. Intended outcome

The completed path is:

```text
Natural-language ETH protection goal
    -> real Thetanuts OptionBook ETH-put orders
    -> deterministic full or explicitly proportional-demo candidate
    -> three-role GoalGuard council review of the exact candidate
    -> fresh, exact trade preview
    -> optional exact ERC-20 approval signed by the user's wallet
    -> freshly simulated OptionBook fill signed by the user's wallet
    -> submitted transaction audit record
    -> canonical Base receipt
    -> matching OptionBook OrderFilled event
    -> direct option buyer verification
    -> Base safe state
    -> confirmed position state
```

A full-coverage candidate may move the goal to `protected`. A proportional-demo candidate must never claim that the original goal is fully protected.

## 3. Frozen product and safety decisions

Implementation agents must treat these decisions as settled:

- Network: Base mainnet only, chain ID `8453`.
- Protocol path: Thetanuts OptionBook only for P0; no RFQ flow.
- Instrument: user buys ETH put protection; no calls, shorts, spreads, or custom contracts.
- SDK: pin exact `@thetanuts-finance/thetanuts-client@0.3.0` after compatibility validation.
- Wallet: one user-controlled EIP-1193 browser wallet. The server and worker never receive a private key.
- Exposure: P0 counts native ETH held by the connected wallet. Gas reserves are calculated separately and may not consume the protected exposure.
- RPC: Alchemy is primary and Infura is fallback. Both are server-side secrets and must report chain ID `8453`. Never use the public Base endpoint as an automatic fallback.
- RPC disagreement: fail closed when the providers disagree on canonical safe state. Cached data must never drive signing or confirmation.
- Normal protection: require full goal coverage.
- Demo protection: allow an explicitly requested, clearly labelled proportional micro-hedge using the same real execution path. It gets a fresh candidate and fresh council review.
- Demo sizing: target approximately `1` USDC premium and enforce the global `3` USD maximum.
- Referral: optional. Pass no referrer when unset. When configured, validate and disclose the address and possible fee share. Referral configuration must not be an execution prerequisite.
- Allowance: exact amount only. Never approve `MaxUint256`.
- Revocation: offer an explicit user-signed `approve(spender, 0)` action for unused approval. Never revoke automatically.
- Quote: exact order/fingerprint equality; no materiality tolerance. A changed order requires a fresh preview and confirmation.
- Preview lifetime: at most two minutes and never beyond the order deadline safety margin.
- Execution concurrency: one active execution attempt per goal/candidate. Terminal attempts remain immutable; retries create new records.
- Wallet rejection: record `cancelled`, distinguishing approval rejection from fill rejection. Do not mark it as a protocol failure.
- Reload recovery: rehydrate the server-authoritative trade, regenerate/revalidate unsigned transactions, and request a new signature. Browser storage holds references and retry metadata only.
- Automated tests: never broadcast a mainnet transaction.
- Live acceptance: a human operates a minimally funded burner wallet and signs every transaction.
- Live flag: enable only for the controlled acceptance/demo window, then disable it again.
- Confirmation: keep public status `submitted` until the fill reaches Base's `safe` chain state.
- On-chain proof: require exact transaction evidence, successful canonical receipt, matching `OrderFilled`, and direct option buyer verification.
- Indexer: use for reconciliation and display enrichment. Indexer lag is not evidence that a chain-proven fill failed.
- Replacement: track sender and nonce. Accept a replacement only if its complete transaction evidence matches; never replay automatically.
- Public states: preserve the Section 17 `TradeStatus` enum. Store safe/finalized and approval evidence in server-only persistence.
- Audit: preserve the original fill hash, replacement evidence, approval/revocation hashes, option address, blocks, fingerprints, and timestamps. Never overwrite immutable evidence.

## 4. Explicit non-goals

- Production readiness for unrestricted public funds.
- Ethereum options trading or any additional chain.
- Base testnet support; the current sponsor material defines no testnet path.
- Thetanuts RFQ/OptionFactory lifecycle.
- Autonomous or server-custodied trading.
- Permit2, unlimited approvals, swaps, vaults, loans, collars, or position management.
- A custom Solidity contract or token.
- Automated mainnet writes in CI, Vitest, or Playwright.
- Full production paging, on-call rotation, RPC quorum infrastructure, or multi-region workers.

## 5. Current repository baseline

Already implemented:

- Server-only Thetanuts clients and live order/market smoke checks.
- Deterministic ETH-put candidate generation.
- Canonical Section 17 Zod contracts and PostgreSQL persistence.
- Trade preview, unsigned approval/fill calldata, wallet readiness, and referral disclosure.
- Browser wallet connection, Base switching, signing, and broadcast.
- Submission matching by chain, sender, target, calldata hash, and value.
- Render worker heartbeat and receipt/indexer polling.
- Server-side execution feature flag and premium cap.

Known gaps to close:

1. The repository pins SDK `0.2.3`, while the hackathon builder document names `0.3.0`.
2. There is only one RPC URL and no Alchemy/Infura fallback policy.
3. Protocol-critical strategy, trade-service, SDK adapter, wallet-send, and worker paths lack direct tests.
4. Final preparation does not recheck selected candidate state.
5. Native ETH exposure and gas are checked independently rather than as reserved obligations.
6. Approval-required fills skip final fill simulation/gas estimation.
7. Approval evidence is not recorded server-side.
8. Reload recovery before broadcast is incomplete.
9. Wallet rejection is not persisted as a stage-specific cancellation.
10. The worker can leave an absent transaction in `submitted` indefinitely.
11. The worker trusts the indexer position without verifying `OrderFilled`, direct buyer state, or Base `safe` finality.
12. Replacement transactions are not reconciled.
13. The code has no explicit proportional-demo semantic and currently rejects partial coverage.
14. Current confirmation logic would mark any confirmed trade as full goal protection.
15. Live smoke evidence and one authorized capped trade have not been recorded.

## 6. Branching and commit discipline

### 6.1 Integration model

Use sequential branches. Each branch starts from `main` after the previous branch has been reviewed and merged. Do not create all branches from the original `main`; the tasks intentionally depend on earlier contract and persistence work.

```text
main
  -> feat/blockchain-sdk-rpc
  -> feat/blockchain-coverage-contracts
  -> feat/blockchain-strategy
  -> feat/blockchain-trade-safety
  -> feat/blockchain-chain-audit
  -> feat/blockchain-wallet-recovery
  -> feat/blockchain-monitor-finality
  -> test/blockchain-end-to-end
  -> docs/blockchain-runbook
```

If pull requests are used, merge in this order. Rebase a not-yet-started branch onto the newly merged `main`; do not mechanically resolve contract or migration conflicts.

### 6.2 Rules for every implementation agent

Before changing files, the agent must:

1. Read `AGENTS.md` completely.
2. Read this plan completely.
3. Read the PRD sections cited by its task.
4. Check `git status --short` and preserve unrelated user changes. The existing untracked `goalguard_prd.pdf` is not part of these tasks.
5. Inspect the actual installed SDK types/source after `pnpm install`; do not implement from memory.
6. Read the relevant Next.js 16 guide under `node_modules/next/dist/docs/` before changing App Router or client-component code.

During implementation:

- Keep route handlers thin.
- Put protocol/domain logic under `src/lib`.
- Validate all external and persistence data with shared Zod schemas.
- Use `Decimal` or `bigint`; never use floating point for financial values.
- Do not log RPC URLs, credentials, raw wallet requests, or private protocol payloads.
- Add tests in the same commit as behavior.
- Do not change work assigned to a later branch.
- Do not enable live execution or broadcast a transaction.
- Do not edit this plan's task status unless specifically assigned to maintain the plan.

### 6.3 Commit format

Each branch has prescribed commits. An agent may split a commit further when it improves reviewability, but must not combine unrelated branches. Use imperative Conventional Commit subjects.

Before handoff, report:

- commits created;
- files changed;
- validation commands run and their results;
- any unrun command and why;
- remaining external dependency or risk;
- confirmation that no live transaction occurred.

## 7. Dependency-ordered implementation tasks

## B1 — SDK 0.3.0 and dual-RPC foundation

Branch: `feat/blockchain-sdk-rpc`  
Depends on: current `main` plus this plan  
PRD areas: Sections 10, 13.1, 14.2, 22, and 24

### Objective

Make all server-side Base/Thetanuts reads use an exact, inspected SDK version and an explicit Alchemy-primary/Infura-fallback configuration without weakening transaction safety.

### Required changes

1. Upgrade `@thetanuts-finance/thetanuts-client` from exact `0.2.3` to exact `0.3.0` using pnpm; commit `package.json` and `pnpm-lock.yaml` together.
2. Inspect the installed `0.3.0` declarations for every used method:
   - `ThetanutsClient` constructor;
   - `api.filterOrders` or its documented equivalent;
   - `api.getMarketData`;
   - `optionBook.previewFillOrder`;
   - `optionBook.encodeFillOrder`;
   - `erc20.getAllowance`, `getBalance`, and `encodeApprove`;
   - `api.getUserPositionsFromIndexer`;
   - event and direct option-read methods needed by B7.
3. Record any API or returned-shape change in a short compatibility note under `docs/` and adapt the wrapper without leaking SDK types across application boundaries.
4. Extend server environment validation with `THETANUTS_RPC_FALLBACK_URL`.
5. Keep `THETANUTS_RPC_URL` as primary for compatibility. Document that deployment config assigns Alchemy to primary and Infura to fallback.
6. Build one server-only provider abstraction used by the Thetanuts client, trade service, smoke check, and worker.
7. Verify both providers report chain ID `8453`.
8. Use primary first and fallback only for classified read/transport failures such as timeout, throttling, connection failure, or temporary unavailability. Do not retry deterministic revert, invalid parameters, validation errors, or writes.
9. Before critical signing preparation, compare the providers' Base `safe` block identity when both respond. If they disagree, return a retryable `503` and prepare nothing.
10. Never automatically use `https://mainnet.base.org`.
11. Redact provider URLs and keys from logs and public error details.
12. Update the smoke check so readiness proves:
    - primary or fallback provider is usable;
    - chain ID is correct;
    - current SDK chain configuration includes OptionBook and USDC;
    - live ETH-put orders and market data parse successfully;
    - the indexer health/read surface is reachable where supported.
13. Preserve `ENABLE_LIVE_THETANUTS_EXECUTION=false`.

### Tests

- Environment accepts two valid URLs and rejects invalid URLs.
- Primary succeeds without calling fallback.
- Fallback is used after a retryable primary failure.
- Deterministic RPC errors do not trigger fallback.
- Wrong chain from either provider fails closed.
- Conflicting safe block identities fail closed.
- Error output never contains RPC credentials.
- SDK-shaped order/market results pass boundary validation; malformed shapes fail closed.

### Commits

1. `build(blockchain): pin Thetanuts SDK 0.3.0`
2. `feat(blockchain): add validated Base RPC fallback`
3. `test(blockchain): cover SDK and RPC readiness`

### Branch acceptance

- Exact SDK and lockfile version are reproducible.
- Read-only smoke behavior works with either configured provider.
- No live write path is enabled.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass.

## B2 — Coverage-mode contract and protection invariants

Branch: `feat/blockchain-coverage-contracts`  
Depends on: B1 merged  
PRD areas: Sections 10.3, 11.3, 17.4.1, 17.4.2, 17.5, 17.9, and 17.11

### Objective

Represent a proportional demo honestly across the PRD, shared contracts, persistence, council input, and goal lifecycle.

### Normative contract decision

Add a canonical candidate field:

```ts
coverageMode: "full" | "proportional_demo";
```

Add an explicit candidate-generation request mode:

```ts
mode?: "full" | "proportional_demo"; // defaults to full
```

The PRD and contracts must define:

- `full` candidates require `goalCoverageBps === 10000` before they can be selected or approved.
- `proportional_demo` candidates require `0 < goalCoverageBps < 10000`, an explicit user request, a capped target premium, and mandatory plain-language disclosures.
- A proportional candidate is reviewed by the council as the exact partial position; the council must not describe it as satisfying the entire goal.
- A confirmed `full` trade atomically moves the goal to `protected`.
- A confirmed `proportional_demo` trade records an active position but leaves the original goal out of `protected`.
- The UI wording for a confirmed proportional trade is `Micro-hedge position active — goal partially covered` or equivalent. It must display coverage percentage/bps.
- A later full-coverage attempt remains possible after a proportional trade.

### Required changes

1. Update `goalguard_prd.md` Section 17 before changing code.
2. Update canonical enums/entities/API schemas and inferred TypeScript types.
3. Add the field to candidate database schema and mapper.
4. Generate a Drizzle migration with `pnpm db:generate`; inspect and commit schema, snapshot, and SQL together.
5. Update fixtures and round-trip contract/repository tests.
6. Update deterministic council rules so proportional demo approval requires:
   - exact coverage disclosure;
   - exact maximum premium loss;
   - acknowledgement that the original goal remains partially uncovered;
   - no statement of guaranteed or complete protection.
7. Update repository confirmation logic so only a confirmed full candidate changes the goal to `protected`.
8. Keep the public `TradeStatus` enum unchanged.
9. Add a frontend workflow stage for a confirmed partial position without adding a misleading canonical goal status unless the PRD explicitly chooses to do so.

### Tests

- Full mode rejects selected candidates below `10000` coverage bps.
- Demo mode rejects zero or full coverage.
- Demo mode cannot be inferred solely from a partial candidate; it must originate from explicit request state retained in the candidate.
- Public candidate responses include `coverageMode` but exclude `protocolRaw`.
- Council input includes the exact mode and coverage.
- Confirmed full trade transitions the goal to `protected` atomically.
- Confirmed proportional trade does not transition the goal to `protected`.
- Mapper round-trip preserves the new field.

### Commits

1. `docs(prd): define proportional demo coverage semantics`
2. `feat(contracts): add candidate coverage mode`
3. `feat(db): persist candidate coverage mode`
4. `test(contracts): enforce protection coverage invariants`

### Branch acceptance

- PRD, Zod contracts, schema, migration, repository, fixtures, and tests agree.
- No UI can equate a partial confirmed position with full protection.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass.

## B3 — Deterministic strategy and proportional candidate generation

Branch: `feat/blockchain-strategy`  
Depends on: B2 merged  
PRD areas: Section 10 and Section 17.4.2

### Objective

Make candidate generation provably correct against SDK `0.3.0` units and support both full coverage and explicit proportional-demo mode without duplicating the execution path.

### Required changes

1. Isolate protocol unit conversions in a small server-only adapter. Every constant must be named, documented from SDK/contracts, and tested:
   - settlement-token decimals from `chainConfig`;
   - protocol contract/quantity precision;
   - strike precision;
   - premium/collateral conversion;
   - PUT collateral-to-contract math.
2. Do not copy JavaScript-number examples from SDK documentation into financial code. Use `bigint` and `Decimal` only.
3. Validate SDK order data before calculation, including implementation, maker/taker direction, option type, strikes, collateral token, deadlines, available amount, and signature fields.
4. Full mode must retain strict hard constraints and refuse when no order fully covers the goal.
5. Proportional-demo mode must:
   - be requested explicitly through the validated API field;
   - target approximately `1` USDC premium without exceeding `MAX_LIVE_TRADE_PREMIUM_USD`;
   - use `previewFillOrder` to derive the real contract quantity;
   - never exceed available liquidity, budget, or wallet-independent product caps;
   - produce correct partial payoff scenarios against the full goal;
   - set `coverageMode: "proportional_demo"` and an accurate `goalCoverageBps`;
   - include disclosures consumed by council/UI;
   - use the same serialized order and later execution pipeline as full mode.
6. Ranking remains deterministic. No viable candidate means a truthful `NO_SUITABLE_CANDIDATE`, never fabricated inventory.
7. Preserve raw SDK payloads internally and return only `PublicProtectionCandidate` externally.
8. Split the current monolithic strategy file only where it improves unit testing; avoid unrelated architectural rewriting.

### Tests

Add SDK-shaped fixtures covering:

- vanilla ETH puts with USDC collateral;
- PUT collateral-versus-contract-count footgun;
- token and strike decimals;
- exact rounding directions;
- expired and near-expiry orders;
- expiry before goal deadline and excessive deadline gap;
- wrong implementation, call, maker-buy, wrong collateral, missing signature, and malformed payload;
- zero/insufficient liquidity and partial fill;
- full coverage success and deterministic ranking;
- full coverage refusal;
- proportional target sizing below, at, and above `1` USDC;
- global `3` USD cap;
- down/flat/up payoff results;
- no exponent notation, float, negative base units, `NaN`, or unsafe-number conversion.

### Commits

1. `refactor(blockchain): isolate Thetanuts unit conversions`
2. `feat(blockchain): generate explicit proportional demo candidates`
3. `test(blockchain): cover order filtering and payoff math`

### Branch acceptance

- Every candidate number is reproducible from stored order data and documented units.
- Full and demo modes are visibly and behaviorally distinct.
- No production fallback data exists.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass.

## B4 — Preview and execution safety

Branch: `feat/blockchain-trade-safety`  
Depends on: B3 merged  
PRD areas: Section 11 and Sections 17.9.2–17.9.4

### Objective

Ensure the exact fill is fresh, affordable, simulated, and explicitly authorized at every stage.

### Required changes

1. Recheck at preview and every preparation:
   - goal ownership and eligible status;
   - candidate remains `selected`;
   - candidate belongs to the goal;
   - council decision belongs to the exact candidate/goal and remains the latest approved decision;
   - coverage-mode invariants;
   - wallet address and chain ID;
   - exact order fingerprint and order deadline;
   - premium cap and quote expiry;
   - worker health;
   - RPC safe-state consistency.
2. Keep exact order equality. Any change yields `CANDIDATE_STALE` and requires a new preview/review where candidate values changed.
3. Remove the mandatory-referrer execution gate. Omit the referrer when unset; preserve validated disclosure when set.
4. Correct wallet readiness:
   - native ETH must cover protected exposure plus the immediate transaction's conservative gas reserve;
   - settlement token must cover the exact premium;
   - approval gas and fill gas are estimated separately;
   - never report required gas as zero merely because approval is needed.
5. Use a two-pass approval flow:
   - first preparation may return the exact approval transaction;
   - after approval confirms, the client calls preparation again;
   - the server refetches the order, allowance, balances, fee data, and candidate state;
   - only then simulate and estimate the exact fill;
   - the user signs the fill only after the post-approval preparation succeeds.
6. Do not use state overrides to pretend an approval exists unless the selected RPCs and SDK explicitly support and test that path. The default design is post-approval re-preparation.
7. Enforce one active attempt per goal/candidate using a transactional repository check and, where practical, a partial unique database index.
8. Ensure idempotency keys cannot create a second trade and cannot be reused for different inputs.
9. Add a thin cancellation endpoint and shared request contract for `approval_rejected`, `fill_rejected`, and `user_cancelled`. Persist stage-specific internal reason while public status becomes `cancelled`.
10. Never create or overwrite a transaction hash during preview or preparation.

### Tests

- stale/unselected candidate at final preparation;
- outdated or mismatched council decision;
- wrong goal/candidate/wallet/network;
- changed order, liquidity, deadline, or fingerprint;
- expired two-minute preview;
- disabled feature flag;
- missing worker heartbeat;
- optional referrer unset/set/invalid;
- cap exceeded;
- insufficient settlement token;
- insufficient exposure after reserving approval gas;
- insufficient exposure after reserving fill gas;
- approval-required first pass;
- successful approval followed by re-preparation and fill simulation;
- allowance still missing after claimed approval;
- exact calldata target/value construction;
- concurrent active attempt rejection;
- idempotent retry;
- stage-specific cancellation.

### Commits

1. `fix(blockchain): revalidate exact candidate before signing`
2. `fix(blockchain): reserve exposure and transaction gas`
3. `feat(blockchain): reprepare fills after exact approval`
4. `feat(trades): persist explicit wallet cancellation`
5. `test(trades): cover preview and execution guards`

### Branch acceptance

- A fresh burner wallet cannot reach a fill signature before approval confirmation and a successful fresh simulation.
- Candidate, council, wallet, quote, cap, and balance checks run server-side.
- No private key or signed transaction enters the server.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and relevant `pnpm test:e2e` cases pass.

## B5 — Append-only chain audit and transaction evidence

Branch: `feat/blockchain-chain-audit`  
Depends on: B4 merged  
PRD areas: Sections 17.6, 17.10, and 17.11

### Objective

Record approval, execution, replacement, receipt, safe/finalized, and revocation evidence without changing the canonical public `TradeStatus` enum or overwriting the first broadcast hash.

### Required persistence model

Add an internal append-only `trade_chain_transactions` table with at least:

- `id` UUID primary key;
- `trade_id` foreign key with restrictive deletion;
- `kind`: `approval | execution | replacement | revocation`;
- `tx_hash` unique;
- `wallet_address`;
- `chain_id` constrained to `8453`;
- `nonce_base_units` nullable until visible;
- `target_address`;
- `calldata_hash`;
- `value_base_units`;
- `status`: `broadcast | mined_success | mined_reverted | replaced | unknown`;
- `replaces_tx_hash` nullable;
- `receipt_block_number` nullable;
- `receipt_block_hash` nullable;
- `created_at` and `updated_at`.

Add server-only execution evidence to `trades` where it is the one canonical value for the trade:

- effective execution hash, nullable and never used to overwrite `Trade.txHash`;
- option address;
- order nonce;
- safe timestamp/block reference;
- finalized timestamp/block reference;
- cancellation stage/reason if not placed in a separate audit table.

The implementing agent may adjust exact internal column grouping to fit Drizzle/PostgreSQL, but must preserve all stated evidence and immutability semantics. Any deviation must be documented in the commit.

### Required changes

1. Update the PRD's server-only persistence decision before schema changes.
2. Generate and inspect the migration with `pnpm db:generate`.
3. Add repository methods that append evidence idempotently by transaction hash.
4. Never overwrite `Trade.txHash`, completed review IDs, candidate snapshot, or existing evidence.
5. Record approval submission only after the wallet broadcasts it; verify its chain, sender, token target, approval spender, exact amount, and calldata before accepting it.
6. Record fill submission using existing strict evidence matching, plus sender nonce.
7. Record explicit revocation evidence separately.
8. Add an API surface for recording approval/revocation hashes if needed. Keep routes thin and validate exact transaction purpose server-side.
9. Public responses expose only allowlisted summaries. Raw audit payloads remain server-only.

### Tests

- mapper/repository round trip for every evidence field;
- duplicate hash is idempotent;
- one hash cannot be attached to different trades or kinds;
- incorrect approval token/spender/amount is rejected;
- incorrect fill sender/target/calldata/value is rejected;
- original execution hash is never overwritten by a replacement;
- submitted/confirmed trade and chain evidence cannot be hard-deleted;
- migration applies to a clean test database.

### Commits

1. `docs(prd): define append-only chain evidence`
2. `feat(db): add trade chain transaction audit`
3. `feat(trades): verify approval and revocation submissions`
4. `test(db): enforce transaction evidence immutability`

### Branch acceptance

- Schema, migration, repository, APIs, and tests agree.
- Every wallet broadcast can be audited without confusing approval/revocation with the fill.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass.

## B6 — Wallet recovery, cancellation, and revocation UX

Branch: `feat/blockchain-wallet-recovery`  
Depends on: B5 merged  
PRD areas: Sections 11, 12, 15, and 17.9

### Objective

Make wallet state changes, reloads, rejection, approval, fill, and unused allowance recover safely without keeping authoritative calldata in browser storage.

### Required changes

1. Read the relevant Next.js 16 client-component documentation before editing UI code.
2. Add `wallet_addEthereumChain` fallback only when the wallet reports Base is unknown. Use official Base chain metadata; do not invent network details.
3. Recheck account and chain immediately before every send.
4. Handle `accountsChanged` and `chainChanged` by invalidating prepared client state and requiring server re-preparation.
5. After approval receipt success:
   - record verified approval evidence;
   - call prepare execution again;
   - do not reuse the pre-approval execution transaction from React state.
6. On reload:
   - use the active goal/trade ID from allowed storage;
   - hydrate the server-authoritative trade;
   - if it is awaiting signature, call preparation again after explicit user action;
   - if a broadcast hash exists locally but was not recorded, safely retry submission recording;
   - never auto-open the wallet or auto-send.
7. On wallet rejection, call the cancellation API with the correct stage. Do not fabricate a hash.
8. For an unused exact allowance, show token, spender, and amount, then offer `Revoke unused approval`:
   - prepare `approve(spender, 0)` through the validated SDK encoder;
   - require a separate wallet signature;
   - verify and record the revocation hash;
   - show success/failure without changing trade success state.
9. Clearly label proportional mode, exact coverage, uncovered amount, and the fact that the goal is not fully protected.
10. Keep `ENABLE_LIVE_THETANUTS_EXECUTION` server-authoritative. The browser cannot enable execution.

### Tests

- successful connection and Base switch;
- unknown-chain add flow;
- account/network changes invalidate prepared state;
- approval success triggers server re-preparation;
- approval rejection, approval revert, fill rejection, and fill revert;
- reload at previewed, awaiting-signature, approval-confirmed, and submitted states;
- known broadcast hash recovery;
- no automatic wallet prompt on hydration;
- revocation prepared for exact token/spender and zero amount;
- proportional UI never says fully protected;
- wallet-send function validates chain and prepared transaction.

### Commits

1. `fix(wallet): invalidate prepared state on wallet changes`
2. `feat(wallet): recover server-authoritative signing state`
3. `feat(wallet): add explicit unused-allowance revocation`
4. `test(wallet): cover signing cancellation and recovery`

### Branch acceptance

- Reload and wallet changes cannot reuse stale calldata.
- Every write remains an explicit human signature.
- Partial positions are presented honestly.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm test:e2e` pass.

## B7 — Base-safe execution and position verification

Branch: `feat/blockchain-monitor-finality`  
Depends on: B6 merged  
PRD areas: Sections 11.4, 13.2, 15.9, 17.9.5, and 17.11

### Objective

Make on-chain evidence authoritative and transition to confirmed only after the exact fill is successful, canonical, and Base-safe.

### Required verification sequence

For every submitted execution:

1. Load immutable expected transaction evidence and the original broadcast hash.
2. Query the transaction and receipt through the validated RPC layer.
3. If the transaction is temporarily absent, retain `submitted` until the verification deadline; do not return forever without applying timeout/replacement logic.
4. Verify chain, sender, destination, calldata fingerprint, value, and sender nonce.
5. Require receipt status success.
6. Verify the receipt's block hash remains canonical.
7. Parse a matching `OrderFilled` emitted by the configured SDK OptionBook:
   - expected order nonce;
   - connected wallet as buyer;
   - expected maker/seller where available;
   - premium amount consistent with the prepared fill;
   - retain `optionAddress`.
8. Read the created option contract directly and verify its `buyer()` equals the connected wallet. Verify other stable fields such as contract quantity when the official SDK exposes them reliably.
9. Wait until the receipt block is at or below Base's `safe` head. Keep public status `submitted` before this point.
10. Atomically confirm the trade and update the goal only according to coverage mode:
    - full -> goal `protected`;
    - proportional demo -> goal remains not fully protected.
11. Query the Thetanuts indexer for reconciliation/display. If its indexed head is behind the receipt block, back off and retry; do not fail chain-proven execution.
12. Record Base `finalized` evidence asynchronously after confirmation.

### Replacement handling

- Track sender plus nonce.
- If the original hash disappears and the nonce advances, locate the canonical replacement using available RPC/provider evidence.
- Accept it only when every expected transaction field matches.
- Append replacement evidence; never overwrite the original `Trade.txHash`.
- A nonmatching replacement becomes a terminal `replaced/cancelled/unknown` audit outcome and must never trigger another fill automatically.
- A pre-safe reorg returns the trade to reconciliation; it does not initiate a new transaction.

### Worker architecture

Extract verification into testable functions with injected provider, Thetanuts reader, clock, and repository. Keep the worker entry point responsible only for configuration, heartbeat, polling, logging, and shutdown.

### Tests

- pending/no transaction before deadline;
- absent transaction after deadline;
- transaction mismatch;
- receipt missing, reverted, and successful;
- noncanonical/reorged block before safe;
- missing, wrong-emitter, wrong-nonce, wrong-buyer, and valid `OrderFilled`;
- direct option buyer mismatch;
- receipt not yet safe and later safe;
- indexer lag and eventual reconciliation;
- indexer unavailable after valid on-chain proof;
- matching and nonmatching replacement;
- duplicate worker polling;
- atomic full confirmation/protection;
- atomic proportional confirmation without full protection;
- finalized evidence update;
- worker heartbeat failure blocks signing preparation.

### Commits

1. `refactor(worker): extract testable trade verification`
2. `feat(blockchain): verify OptionBook fill and direct buyer`
3. `feat(blockchain): require Base safe finality`
4. `feat(blockchain): reconcile replacement and indexer lag`
5. `test(worker): cover transaction and position verification`

### Branch acceptance

- A client hash alone can never confirm a trade.
- An indexer response alone can never confirm a trade.
- Only Base-safe, exact, chain-proven execution changes protected state.
- The worker reaches a bounded recoverable or terminal outcome for missing transactions.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass.

## B8 — Cross-layer integration and browser coverage

Branch: `test/blockchain-end-to-end`  
Depends on: B7 merged  
PRD areas: Sections 17.12, 19, 20, and 25

### Objective

Prove that all branches work together without using real funds in automation.

### Required changes

1. Add service-level integration tests using SDK-shaped fakes at the external boundary and the PGlite repository adapter.
2. Cover the full state sequence:

```text
goal
  -> full/demo candidate
  -> approved/disputed/blocked council decision
  -> previewed
  -> awaiting_signature
  -> approval recorded when required
  -> post-approval re-preparation
  -> execution submitted
  -> Base-safe confirmed
  -> correct full or partial goal result
```

3. Expand Playwright tests for user-visible recovery and safety behavior. Browser tests may mock same-origin APIs but fixtures must remain confined to tests.
4. Add regression coverage for duplicate clicks, page refresh, network/account changes, expired quotes, wallet rejection, worker unavailability, RPC fallback, and partial-position wording.
5. Confirm production code fails safely when APIs or environment configuration are absent.
6. Run the full local validation matrix.

### Required validation

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Live smoke commands remain opt-in and are not replaced by mocks:

```text
pnpm smoke:thetanuts
```

### Commits

1. `test(blockchain): add cross-layer execution integration`
2. `test(e2e): cover wallet recovery and partial protection`
3. `test(blockchain): close execution safety regression matrix`

### Branch acceptance

- All required validation commands pass.
- No test broadcasts a transaction or requires a private key.
- Every Section 17.12 blockchain invariant has explicit coverage.

## B9 — Documentation, deployment, and acceptance runbook

Branch: `docs/blockchain-runbook`  
Depends on: B8 merged  
PRD areas: Sections 18, 19, 20, 21, 22, and 25

### Objective

Make the blockchain system operable by the team and auditable by judges without developer-only knowledge.

### Required documentation

1. Update README setup for:
   - exact SDK version;
   - Alchemy primary and Infura fallback variables;
   - Base chain ID;
   - optional referrer;
   - premium/demo caps;
   - Vercel UI/API and Render worker;
   - migrations using `DATABASE_DIRECT_URL`;
   - read-only smoke test;
   - feature-flag safety.
2. Add an architecture document covering:
   - sources of truth;
   - unsigned server preparation and browser signing;
   - approval and post-approval re-preparation;
   - chain audit evidence;
   - Base safe/finalized semantics;
   - full versus proportional position behavior;
   - RPC fallback and failure handling;
   - worker heartbeat and recovery.
3. Add a controlled live-acceptance runbook with explicit go/no-go checks.
4. Add an evidence template. Do not commit credentials, private organizer messages, wallet keys, or unrestricted database exports.
5. Update `docs/development-progress.md` with evidence-backed statuses only.
6. Document rollback/kill-switch procedure: disable execution first, keep worker monitoring submitted trades, and never delete audit records.

### Commits

1. `docs(blockchain): document setup and architecture`
2. `docs(blockchain): add live acceptance and rollback runbook`

### Branch acceptance

- A teammate can configure read-only integration and worker deployment from documentation.
- The live runbook cannot be mistaken for permission to transact.
- `pnpm lint` and link/path review pass; run full `pnpm check` if documentation changes touch configuration or code.

## 8. Final live-acceptance gate

This is an operator procedure, not an automated test branch.

### 8.1 Required before enabling

- Written MUBA/Thetanuts confirmation allowing the required real Base-mainnet trade is retained outside source control where appropriate.
- All B1–B9 branches are merged and deployed.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm test:e2e` pass on the release commit.
- `pnpm smoke:thetanuts` succeeds using live Base data.
- Vercel API/UI and Render worker use the same release revision.
- Worker heartbeat is healthy.
- Alchemy primary and Infura fallback both report Base `8453` and consistent safe state.
- A suitable live ETH-put order exists.
- The burner wallet contains only the intended native ETH exposure, approximately `1–3` USDC, and enough extra Base ETH for approval, fill, and optional revocation gas.
- The repository and git history have been checked for secrets.
- `ENABLE_LIVE_THETANUTS_EXECUTION` is still false during preflight.

### 8.2 Controlled execution

1. Enable live execution in the server environment for the controlled window.
2. Confirm the frontend capability reflects the server flag.
3. Use GoalGuard to create the exact full or explicitly proportional candidate.
4. Complete a fresh council review.
5. Review coverage, uncovered value, premium, expiry, settlement token, referrer disclosure, allowance, and gas.
6. Sign the exact approval if required and wait for success.
7. Allow GoalGuard to reprepare and simulate the fill.
8. Inspect and sign the fill.
9. Record the broadcast hash immediately.
10. Wait for matching receipt, `OrderFilled`, direct buyer verification, and Base safe state.
11. Verify the UI uses the correct full or proportional position wording.
12. Wait for or later record Base finalized evidence.
13. Disable live execution after the evidence run.
14. Keep the worker running until every submitted transaction reaches a resolved state.

### 8.3 Evidence bundle

Retain a secret-free bundle containing:

- release commit SHA;
- exact SDK and ethers versions;
- Base chain/deployment identifiers resolved from SDK config;
- redacted RPC-provider readiness result;
- goal, candidate, council decision, trade, and request IDs;
- coverage mode and bps;
- approval hash and receipt when applicable;
- original fill hash and any replacement evidence;
- prepared target/calldata/value fingerprints;
- successful canonical receipt and block hash;
- matching `OrderFilled` values and option address;
- direct buyer verification;
- Base safe and finalized references;
- Thetanuts position/indexer reconciliation ID and lag information;
- timestamps and redacted screenshots;
- confirmation that the live feature flag was disabled afterward.

## 9. Definition of done

### 9.1 Implementation complete; live acceptance pending

Use this status only when:

- B1–B9 are merged;
- all required local validation passes;
- deployment is healthy;
- live reads and unsigned preview/simulation work;
- the live flag remains disabled because external permission or the controlled execution window is pending.

### 9.2 Person B complete

Person B is complete only when:

- real Thetanuts orders drive candidates;
- deterministic unit/payoff/filtering tests pass;
- full and proportional coverage semantics are honest;
- exact preview, approval, post-approval simulation, and fill preparation work;
- browser signing remains noncustodial and explicit;
- submission, replacement, receipt, event, buyer, safe, and indexer reconciliation work;
- full coverage alone can mark the goal fully protected;
- fallback RPC and worker failures stop safely;
- all required validation passes;
- documentation and evidence are complete;
- when authorized and enabled, one capped real OptionBook trade succeeds through the deployed GoalGuard UI.

### 9.3 Not sufficient for done

None of these alone is completion:

- a successful market-data call;
- generated calldata;
- a wallet popup;
- an approval hash;
- a submitted fill hash;
- a successful receipt without matching protocol evidence;
- an indexer position without matching chain evidence;
- mocked E2E success;
- locally toggling the execution flag without authorization;
- a partial trade displayed as complete goal protection.

## 10. Agent task prompt template

Use this template in a new coding-agent chat:

```text
Read /Users/tanshihan/GoalGuard/AGENTS.md and
/Users/tanshihan/GoalGuard/docs/blockchain-implementation-plan.md completely.

Implement only task <B# — task name> on branch <branch name>. The prior dependency
branches are already merged. Treat goalguard_prd.md Section 17 as normative. Preserve
unrelated working-tree changes. Do not enable live execution, use private keys, or
broadcast a transaction.

Follow the task's required changes, tests, commits, and acceptance gate. Inspect the
installed Thetanuts SDK rather than inventing APIs. Run every validation command required
by AGENTS.md and the task. At handoff, report commits, changed files, validation results,
unrun checks, risks, and confirmation that no live transaction occurred.
```

The coordinating owner—not an implementation agent working on a narrow branch—decides when a branch is accepted and when this plan's progress status is updated.

## 11. Primary references

- Repository product specification: `goalguard_prd.md`, especially Section 17.
- Builder document: `/Users/tanshihan/Downloads/Thetanuts MUBA Hackathon Builder Docs.pdf`.
- Official SDK: <https://github.com/Thetanuts-Finance/thetanuts-sdk>
- Official SDK module reference: <https://github.com/Thetanuts-Finance/thetanuts-sdk/blob/main/src/modules/README.md>
- Base transaction finality: <https://docs.base.org/base-chain/network-information/transaction-finality>
- Base transaction troubleshooting: <https://docs.base.org/base-chain/network-information/troubleshooting-transactions>
