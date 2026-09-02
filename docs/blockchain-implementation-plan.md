# GoalGuard P0 Blockchain Implementation Plan

Status: approved demo-only design; implementation not started

Owner: Person B — Blockchain / Strategy

Last reviewed: 2026-09-02

Target: live Thetanuts data and a real unsigned Base transaction preview, with no signature or broadcast

## 1. Authority and mandatory policy

This is the source of truth for Person B implementation branches. Instruction precedence is:

1. AGENTS.md.
2. goalguard_prd.md, especially Section 17.
3. This plan.
4. Branch-specific agent instructions.

The PRD is normative. Do not silently restore the older live-execution design.

The submitted and demonstrated build must:

- use Base mainnet, chain ID 8453, for live read-only data and unsigned construction;
- use the current official Thetanuts SDK/contract flow;
- finish in TradeStatus previewed;
- keep ENABLE_LIVE_THETANUTS_EXECUTION=false;
- never request a wallet signature or broadcast;
- never create a transaction hash, confirmed position, or protected goal;
- make execute and submission routes return 422 EXECUTION_DISABLED.

GoalGuard has chosen the organizer-permitted no-real-trade path. This plan does not authorize turning the flag on.

## 2. Intended outcome

    Goal
      -> live Thetanuts ETH-put orders
      -> deterministic full or proportional-demo candidate
      -> council review of the exact candidate
      -> fresh order revalidation
      -> real unsigned transaction construction
      -> previewed demo-ready state
      -> stop

Required final message:

    Demo preview ready — no transaction was signed, no funds moved,
    and no protected position was created.

## 3. Progress and branch order

| Task | Branch | Status |
|---|---|---|
| B0 Baseline/policy alignment | feat/blockchain-baseline-alignment | Not started |
| B1 SDK and dual RPC | feat/blockchain-sdk-rpc | Not started |
| B2 Coverage contracts | feat/blockchain-coverage-contracts | Not started |
| B3 Deterministic strategy | feat/blockchain-strategy | Not started |
| B4 Unsigned preview safety | feat/blockchain-unsigned-preview | Not started |
| B5 Demo-only UI | feat/blockchain-preview-ui | Not started |
| B6 Integration/E2E tests | test/blockchain-preview-e2e | Not started |
| B7 Documentation/runbook | docs/blockchain-runbook | Not started |
| B8 Release verification | chore/blockchain-release-verification | Not started |

Branches are sequential. Start each from main only after the previous branch is reviewed and merged.

For every branch: read AGENTS.md, this plan, and cited PRD sections; inspect git status; preserve unrelated changes; inspect installed SDK types; use Node.js 22; keep routes thin; validate boundaries with Zod; use bigint/Decimal; add tests with behavior; never sign or broadcast.

Every handoff must report commits, files, validation results, unrun checks, risks, and confirmation that no signature or broadcast occurred.

## 4. Frozen decisions and non-goals

- Base mainnet 8453 only; no unsupported testnet.
- Thetanuts OptionBook ETH puts only; no RFQ, calls, shorts, spreads, or custom contracts.
- SDK target is exact 0.3.0 from builder material, subject to B1 compatibility verification. Installed official SDK types/source are implementation truth.
- Alchemy is primary RPC; Infura is fallback. Both are server secrets. Never auto-fallback to the public Base RPC.
- Full mode seeks 10000 coverage bps.
- Proportional demo is explicit, visibly partial, targets about 1 USDC, and obeys the global 3 USD preview cap.
- Referral is optional, validated, and disclosed.
- Any displayed approval is exact and unsigned; never MaxUint256.
- Quote lifetime is at most two minutes and within the order safety margin.
- Connecting a wallet may supply a taker address/read-only readiness only. No signing/sending action may exist.
- previewed is terminal. awaiting_signature, submitted, confirmed, txHash, and protected are dormant.
- No approval confirmation, revocation, receipt/event/finality monitoring, replacement handling, or live acceptance trade is P0.
- No production fallback fixtures or invented sponsor methods/addresses.

## 5. Current baseline

The repository already contains server Thetanuts clients, deterministic candidate generation, Zod/persistence contracts, council workflow, trade routes, idempotency/locking, strategy tests, monitor tests, frontend preview/retry behavior, smoke workflow, and migrations.

Important:

- goalCoverageBps exists but was not formally defined in the old plan.
- signing/submission/monitor code is future compatibility and must remain unreachable.
- active docs still contain old live-execution language.
- lint currently scans repository-local .agents skill scripts outside application scope.
- Node.js 22 is the supported release runtime.

## 6. Tasks

## B0 — Baseline and policy alignment

Branch: feat/blockchain-baseline-alignment

Depends on: current main

PRD: Sections 4, 8, 11, 17, 22, 25

### Work

1. Scope lint to GoalGuard application/config files or exclude repository-local agent/skill implementation files. Do not rewrite external skill scripts for app lint.
2. Align README, development-progress, frontend-checkpoints, .env.example comments, and active docs with demo-only unsigned preview.
3. State the flag remains false; remove hackathon instructions to enable it after approval.
4. Preserve dormant future code but remove any user-accessible path that conflicts.
5. Record Node.js 22 consistently.

### Commits

1. chore(lint): scope checks to GoalGuard application files
2. docs(policy): align repository with unsigned-demo policy

### Done

Active docs agree; lint/typecheck/test/build pass under Node.js 22; no blockchain behavior is broadened.

## B1 — Official SDK and dual RPC

Branch: feat/blockchain-sdk-rpc

Depends on: B0

PRD: Sections 10, 13.1, 14.2, 17.8, 22, 24

### Work

1. Inspect package metadata, installed declarations, official repository source, and builder docs.
2. Pin exact SDK 0.3.0 and update package/lockfile together.
3. Verify used methods and shapes: market/orders, previewFillOrder, encodeFillOrder, allowance/balance reads, and exact approval encoding.
4. If 0.3.0 is unavailable/incompatible, stop B1 and document the exact mismatch. Do not guess or silently stay old.
5. Keep SDK types behind a server-only adapter.
6. Add validated THETANUTS_RPC_FALLBACK_URL; retain THETANUTS_RPC_URL as primary.
7. Configure Alchemy primary and Infura fallback; both must report chain 8453.
8. Fallback only for timeout, throttling, connection, or temporary read failures—not deterministic errors or writes.
9. Fail final preview on wrong chain, stale data, or relevant unresolved provider disagreement.
10. Redact URLs/keys; never auto-use the public Base RPC.

### Tests

Environment validation; primary success; retryable fallback; deterministic error no fallback; wrong chain; malformed SDK data; credential redaction; live-shaped read parsing.

### Commits

1. build(blockchain): pin inspected Thetanuts SDK
2. feat(blockchain): add validated Base RPC fallback
3. test(blockchain): cover SDK and RPC readiness

### Done

SDK/lockfile are reproducible; both providers work fail-closed; only reads and unsigned construction are enabled; lint/typecheck/test/build pass.

## B2 — Coverage contracts and preview semantics

Branch: feat/blockchain-coverage-contracts

Depends on: B1

PRD: Sections 10.3, 11.3, 17.4.1, 17.4.2, 17.5, 17.9

### Canonical meaning

goalCoverageBps is the proposed option quantity divided by the ETH quantity required by the goal, in basis points:

    raw = floor(candidateQuantityUnderlying * 10000 / requiredGoalQuantityUnderlying)
    goalCoverageBps = min(10000, raw)

Both quantities must use the same ETH-underlying unit. Required quantity must be positive; candidate quantity cannot be negative. Calculate with Decimal/base units and round down. The current quantity divided by desiredQuantity behavior is the intended basis.

10000 means proposed quantity is at least the required quantity; 5000 means half. It is not probability, guaranteed payout, recovered-loss percentage, or evidence of execution.

Add canonical coverageMode:

    full | proportional_demo

- full requires 10000 bps.
- proportional_demo requires more than 0 and less than 10000, and explicit request state.
- council reviews exact proposed/uncovered quantities.
- neither mode marks the goal protected in P0.

### Work and tests

Update PRD first if needed, then Zod/types, API, persistence/mappers, migration, fixtures, council input, disclosures, and UI contract together. Public responses expose mode/bps but not protocolRaw.

Test zero required quantity, exact/excess/partial coverage, round-down, mode invariants, explicit proportional request, contract/mapper round trip, and unsafe numeric forms.

### Commits

1. docs(prd): define proposed coverage basis points
2. feat(contracts): add explicit coverage mode
3. feat(db): persist candidate coverage mode
4. test(contracts): enforce preview coverage semantics

### Done

PRD, contracts, persistence, strategy, council, UI, and tests share one definition; no preview can protect a goal; validations pass.

## B3 — Deterministic strategy

Branch: feat/blockchain-strategy

Depends on: B2

PRD: Sections 10 and 17.4.2

### Work

1. Isolate/document settlement decimals, quantity precision, strike precision, premium/collateral conversion, and put collateral-to-contract math.
2. Use bigint/Decimal only.
3. Validate implementation, side, option type, underlying, strike, collateral, deadlines, availability, and signature fields.
4. Full mode returns NO_SUITABLE_CANDIDATE if no order reaches 10000 bps.
5. Explicit proportional mode targets about 1 USDC, obeys the 3 USD preview cap, uses official preview sizing, respects liquidity, calculates whole-goal scenarios, and carries partial disclosures.
6. Keep deterministic ranking/tie-breakers.
7. Keep raw SDK data server-only.
8. Reuse current dependency injection/tests; refactor only for useful test boundaries.
9. Do not connect generation to signing/broadcast.

### Tests

SDK-shaped ETH-put fixtures; decimals; collateral/contract-count conversion; rounding; expiry/deadline; wrong implementation/type/side/collateral; malformed data; liquidity; full success/refusal; deterministic rank; proportional target/cap; payoff scenarios; no float/NaN/exponent/unsafe conversion.

### Commits

1. refactor(blockchain): isolate Thetanuts unit conversions
2. feat(blockchain): generate explicit proportional previews
3. test(blockchain): cover filtering sizing and payoff math

### Done

Every candidate is reproducible; modes are honest; no production fake inventory; validations pass.

## B4 — Fresh unsigned transaction preview

Branch: feat/blockchain-unsigned-preview

Depends on: B3

PRD: Sections 11 and 17.9.1–17.9.4

### Work

1. At preview recheck ownership/status, goal-candidate link, selected status, latest exact approved council decision, coverage invariants, taker address, chain 8453, order fingerprint, liquidity, deadline, freshness, cap, and expiry.
2. Re-fetch the live selected order immediately before construction.
3. Changed identity or candidate-affecting values return CANDIDATE_STALE and require regeneration/review.
4. Use official SDK/contract flow to construct the exact unsigned transaction.
5. Return allowlisted chain ID, target, value base units, calldata/safe summary, purpose, expiry, and proposal amounts.
6. Any approval preview is exact, unsigned, clearly labelled, and never MaxUint256.
7. Referrer remains optional.
8. Preserve preview idempotency.
9. Create/replace only a previewed trade.
10. Never set awaiting_signature, submitted, confirmed, txHash, confirmedAt, or protected.
11. Keep flag false.
12. Execute and submission always return 422 EXECUTION_DISABLED under demo policy.
13. Do not require worker health, approval confirmation, send-gas reservation, or finality for preview.

### Tests

Wrong owner/goal/candidate/council/wallet/chain; unselected/stale candidate; changed order/liquidity/premium/deadline/fingerprint; expiry; coverage; referrer; cap; exact target/calldata/value; exact approval; idempotency; no tx hash; execute/submission 422; no wallet signing/send invocation.

### Commits

1. fix(blockchain): revalidate selected order before preview
2. feat(blockchain): build terminal unsigned transaction preview
3. fix(trades): fail closed execution and submission routes
4. test(trades): cover unsigned preview safety

### Done

Fresh live data produces a real unsigned preview; previewed is terminal; manual APIs cannot execute; validations including relevant E2E pass.

## B5 — Demo-only UI

Branch: feat/blockchain-preview-ui

Depends on: B4

PRD: Sections 6, 8, 11.3, 12, 15, 17.9

### Work

1. Read relevant Next.js 16 client docs.
2. Final CTA says Generate unsigned preview, never Execute/Buy/Sign/Protect.
3. Show live timestamp, option/strike/expiry/quantity/premium, mode/bps/uncovered amount, token/referrer, unsigned chain/target/value/calldata summary, and expiry.
4. Show the mandatory no-signature/no-funds/no-position completion message.
5. Remove/hide approval send, signing, broadcast, retry-send, and revocation controls.
6. Frontend demo flow never calls execute/submission.
7. If wallet connection remains, use it only for address/network reads; account/chain changes invalidate preview. Never call signing or send methods.
8. Do not persist authoritative calldata in browser storage.
9. Missing production API/config fails safely with no fixtures.

### Commits

1. feat(frontend): end blockchain flow at unsigned preview
2. fix(frontend): remove demo signing and broadcast controls
3. test(frontend): cover unsigned preview disclosures

### Done

Judges see the exact proposal and understand it was not executed; no UI action can open signing/broadcast; lint/typecheck/test/build/E2E pass.

## B6 — Integration and browser tests

Branch: test/blockchain-preview-e2e

Depends on: B5

PRD: Sections 17.12, 19, 20, 25

### Required lifecycle

    goal -> candidate -> council -> unsigned construction -> previewed -> stop

### Work

1. Add service integration tests with SDK-shaped fakes only at external boundaries.
2. Cover approved/disputed/blocked council results.
3. Cover stale live data, fallback, wrong chain, expiry, duplicate clicks, refresh, and partial wording.
4. Assert P0 never reaches awaiting_signature/submitted/confirmed/protected or non-null txHash.
5. Route tests prove execute/submission return 422.
6. Playwright covers visible demo flow; fixtures remain test-only.
7. Spy on wallet/provider methods and assert no signing/send method is called.
8. Production code fails safely when services/config are absent.

### Validation

    pnpm lint
    pnpm typecheck
    pnpm test
    pnpm build
    pnpm test:e2e

smoke:thetanuts remains opt-in/read-only and never signs or broadcasts.

### Commits

1. test(blockchain): add unsigned preview integration flow
2. test(e2e): cover terminal demo preview
3. test(blockchain): enforce disabled execution boundaries

### Done

Cross-layer tests prove both successful preview and impossible execution; no private key/funds; all checks pass on Node 22.

## B7 — Documentation and evidence

Branch: docs/blockchain-runbook

Depends on: B6

PRD: Sections 18–22 and 25

### Work

Document SDK compatibility, Alchemy/Infura variables, Base 8453, official SDK-sourced addresses, cap/referrer, Vercel, migrations, Node 22, and dormant Render monitor. State flag false is fixed, not an approval switch.

Add read-only smoke steps and a demo script: goal, live orders, candidate/council, unsigned preview, inspect chain/target/value/calldata/premium/coverage, stop before signing.

Add a secret-free evidence template: release SHA, SDK version, redacted RPC readiness, live timestamps/order ID, goal/candidate/decision/preview/request IDs, mode/bps, unsigned fingerprints, screenshots, absent txHash, and execute/submission 422.

### Commits

1. docs(blockchain): document unsigned preview architecture
2. docs(blockchain): add demo and evidence runbook

### Done

A teammate can configure/demo it; runbook cannot be mistaken for transaction permission; docs checks pass.

## B8 — Final release verification

Branch: chore/blockchain-release-verification

Depends on: B7

PRD: Sections 19, 20, 25, 26

### Procedure

1. Confirm B0–B7 merged and clean intended tree.
2. Use Node 22; verify SDK/lockfile.
3. Run lint, typecheck, test, build, and test:e2e.
4. Run credentialed read-only smoke if access exists.
5. Verify Alchemy and Infura independently report 8453.
6. Verify deployed UI/API revision match.
7. Complete one deployed live-data unsigned preview.
8. Verify previewed status and absent txHash/submittedAt/confirmedAt/protected.
9. Retain evidence that execute/submission return 422.
10. Verify flag false everywhere.
11. Inspect logs for accidental sign/send/secrets/raw payload.
12. Store only secret-free evidence.

Commit: chore(blockchain): record release verification evidence

### Done

Deployed live data and real unsigned construction work; all checks pass or environment-only exceptions are recorded; no signature, broadcast, tx hash, or protected goal exists.

## 7. Definition of done

Person B is complete when:

- inspected official SDK and dual RPC drive live reads;
- deterministic candidates and formal coverage semantics are tested;
- selected order is freshly revalidated;
- official flow builds a real unsigned transaction;
- previewed is terminal;
- UI/API cannot sign or broadcast;
- execute/submission return 422;
- no preview protects a goal;
- unit/integration/route/browser tests pass;
- setup, demo, and evidence docs are complete.

Engineering completion does not depend on a live trade or external authorization.

Forbidden release outcomes: wallet signature request, wallet send call, broadcast, tx hash, awaiting_signature/submitted/confirmed/protected, browser-enabled execution, successful execute/submission, or partial preview presented as full protection.

## 8. Agent prompt template

    Read AGENTS.md and docs/blockchain-implementation-plan.md completely.
    Implement only task <B#> on branch <branch>. Previous dependencies are merged.
    Treat goalguard_prd.md Section 17 as normative and preserve unrelated changes.

    This is demo-only. Keep ENABLE_LIVE_THETANUTS_EXECUTION=false. Do not request
    a signature, use a private key, broadcast, create a tx hash, or protect a goal.

    Follow required work, tests, commits, and Done. Inspect the installed SDK.
    Run AGENTS.md/task validations. Report commits, files, results, unrun checks,
    risks, and confirmation that no signature or broadcast occurred.

## 9. Post-hackathon only — not authorized

Removed old B5–B7 work:

- approval/execution/replacement/revocation audit;
- signing, cancellation, reload recovery, and revocation UX;
- submission/hash recovery;
- receipts, OrderFilled, direct buyer verification;
- Base safe/finalized and replacement reconciliation;
- confirmed position and protected goal;
- burner-wallet live acceptance.

Existing compatible code may remain fail-closed. Do not implement or expose these features under B0–B8. Future live execution requires a new PRD decision and separate plan; setting an environment variable is not sufficient authorization.

## 10. References

- goalguard_prd.md, especially Section 17.
- /Users/tanshihan/Downloads/Thetanuts MUBA Hackathon Builder Docs.pdf.
- https://github.com/Thetanuts-Finance/thetanuts-sdk
- https://github.com/Thetanuts-Finance/thetanuts-sdk/blob/main/src/modules/README.md
- AGENTS.md.
