# GoalGuard development progress

Last verified: **2026-09-01** against baseline commit `a66c0b0`.

This is the repository-wide delivery tracker. `goalguard_prd.md` remains the normative product and contract specification; this file records implementation evidence and the work still required to satisfy it. The ownership model below follows PRD Section 18 exactly: **three developers**, plus explicitly shared responsibilities. Technical subtasks do not represent additional people.

## Status definitions

- **Complete:** implemented and verified for the stated scope.
- **Implementation ready:** code exists, but a live dependency or manual acceptance gate has not been verified.
- **In progress:** part of the workstream is implemented and concrete tasks remain.
- **Blocked:** the next acceptance gate depends on missing backend behavior, credentials, approval, or deployment.
- **Not started:** no repository implementation was found.

## Delivery overview

| PRD milestone | Status | Repository evidence | Gate still required |
|---|---|---|---|
| M1 Integration skeleton | Implementation ready | Next.js shell, SQLite repository, Gonka and Thetanuts read-only adapters, integration status API, smoke scripts, and injected Base wallet are implemented. | Run both sponsor smoke scripts with valid credentials and record real request/market evidence; manually verify a real wallet connection. |
| M2 Goal engine | In progress | Canonical parse/edit contracts and the complete clarification/confirmation frontend exist. | Implement `POST /api/goals/parse`, `PATCH /api/goals/{goalId}`, and `GET /api/goals/{goalId}` with session ownership and Gonka-backed parsing. |
| M3 Strategy engine | In progress | Candidate contracts and all candidate/plan/scenario frontend states exist. | Implement live order normalization, deterministic calculations, hard-constraint filtering, ranking, persistence, freshness, and `POST /api/protection/candidates`. |
| M4 GoalGuard council | In progress | Three-role council contracts, UI, audit identifiers, and frontend trade gates exist. | Implement three Gonka reviews using at least two configured models, deterministic consensus, persistence, retry attempts, and `POST /api/council/review`. |
| M5 Trade preview and execution | In progress | Preview, explicit confirmation, wallet sequencing, recovery, and protected-state frontend code exists behind a server capability. | Implement preview/revalidation/cap enforcement, execution preparation, submission verification, trade hydration, and one approved burner-wallet live run. |
| M6 Product polish | In progress | Responsive branded shell, reusable UI primitives, plain-language plan presentation, error states, focus behavior, and automated accessibility checks exist. | Complete the full recovery/error browser matrix, keyboard/zoom/manual responsive QA, and production-backend walkthrough. |
| M7 Submission readiness | Blocked | PRD, README, environment template, setup commands, safety boundaries, and local validation commands are documented. | Confirm public-release safety, scan full Git history for secrets, document AI tools, deploy the live demo, capture sponsor evidence, and complete submission material. |

## Three-developer ownership

| PRD owner | Current status | Main implemented foundation | Next ownership gate |
|---|---|---|---|
| Person A — AI / Backend | In progress | Gonka connectivity, strict contracts, SQLite foundation, repository adapter, and integration status API. | A natural-language goal produces a persisted canonical goal and three persisted Gonka reviews produce a deterministic decision. |
| Person B — Blockchain / Strategy | In progress | Base RPC/Thetanuts read-only connectivity, SDK pinning, market smoke check, and Base wallet client foundation. | A goal produces live deterministic candidates, a revalidated preview, and a safely gated real trade when enabled. |
| Person C — Product / Frontend | Implementation ready, integration blocked | FE0-FE6 UI, typed client, reducer workflow, wallet UX, accessibility primitives, and preview-only browser path. | The complete happy path works against Persons A and B's production services without raw developer/protocol output. |

### Person A — AI / Backend

PRD ownership: Gonka Router integration, goal parsing, GoalGuard prompts, structured AI schemas, request-ID capture, deterministic consensus, and AI error handling.

Completed:

- Server-only OpenAI-compatible Gonka client, configurable model/header handling, request metadata capture, missing-request-ID degradation, smoke script, and isolated readiness status.
- Canonical Zod contracts and server environment validation used by the planned goal/council APIs.
- Six-table SQLite schema, migration, mappers, forward state transitions, candidate/council persistence primitives, and trade idempotency foundation.
- `GET /api/integrations/status` with independent safe summaries.

Remaining tasks:

1. Add same-browser/session ownership and implement Gonka-backed `POST /api/goals/parse`.
2. Implement draft-only `PATCH /api/goals/{goalId}` and canonical aggregate `GET /api/goals/{goalId}` hydration.
3. Implement Strategist, Risk Auditor, and Consumer Advocate prompts with strict structured-output validation and at least two distinct models.
4. Persist exact request IDs, all three reviews, explicit retry attempts, and deterministic approved/disputed/blocked consensus in `POST /api/council/review`.
5. Expand repository operations for editable goals, atomic candidate/decision/goal transitions, aggregate hydration, immutable hashes, and receipt-derived status transitions.
6. Coordinate route handlers for Person B's candidate, preview, execution, submission, and trade-status services while preserving canonical errors and hiding raw provider payloads.
7. Add route/repository tests for ownership, conflicts, atomic rollback, malformed inference, missing request IDs, and the PRD error matrix.

Definition-of-done gate:

```text
Natural-language goal
        -> GoalDraft / Goal
        -> 3 independent council reviews
        -> deterministic CouncilDecision
```

### Person B — Blockchain / Strategy

PRD ownership: Base RPC, Thetanuts SDK, market/order retrieval, option filtering, deterministic payoff/scenario calculations, trade preview, wallet execution, and transaction/position verification.

Completed:

- Official Thetanuts `0.2.x` client pinned and used server-side with SDK-provided Base configuration.
- Real read-only market/order check, ETH put filtering, isolated status, and opt-in smoke script.
- Injected EIP-1193 wallet foundation for explicit connection, Base switching, account/chain invalidation, and unsigned transaction submission.
- Frontend execution state supports preview expiry, acknowledgment, exact approval-before-execution ordering, hash recovery, polling, and protected-state gating; live execution remains disabled.

Remaining tasks:

1. Normalize live orders without exposing `protocolRaw`.
2. Implement decimal-safe premium, quantity, coverage, protected-floor, deadline-gap, and scenario calculations.
3. Apply hard constraints, deterministic ranking, rejection summaries, freshness rules, and provide the strategy service for `POST /api/protection/candidates`.
4. Implement preview revalidation, balances, allowance, gas, quote expiry, decision/candidate checks, and the premium cap for `POST /api/trades/preview`.
5. Generate SDK-derived unsigned approval/fill transactions only after every safety gate passes.
6. Implement/coordinate execution preparation, idempotency, submission validation, Base receipt polling, and protocol-position verification for the trade APIs.
7. Prove account/network invalidation, exact retry behavior, stale/expired recovery, and backend-only confirmation with automated tests.
8. Perform one organizer-approved burner-wallet transaction with `MAX_LIVE_TRADE_PREMIUM_USD` enforced.

Definition-of-done gate:

```text
Goal
    -> live candidates
    -> deterministic candidate values
    -> preview
    -> real trade when enabled
```

### Person C — Product / Frontend

PRD ownership: overall UI, chat flow, goal cards, protection-plan card, GoalGuard visualization, wallet UX integration with Person B, loading/error states, protected-goal success state, and final polish.

Completed:

- FE0 foundation and the `/` plus `/goals/{goalId}` application surfaces.
- Natural-language goal intake, clarification, editable confirmation, candidate plans, scenarios, three-role council review, trade preview, execution/recovery states, and protected-goal presentation.
- Typed API validation, reducer-driven state, guarded browser persistence, shared wallet provider, accessibility primitives, responsive styling, and production/test fixture isolation.
- Component tests cover core input, wallet, council, preview-only, and reducer safety behavior; Playwright covers the landing page and fixture-backed approved plan through preview-only.

Remaining tasks:

1. Integrate and verify each screen as Persons A and B deliver the production routes.
2. Add browser cases for multi-turn clarification, no candidate, disputed/blocked council, quote expiry, wallet rejection, transaction failure, reload recovery, and confirmed protection.
3. Verify every canonical persisted goal/trade status against real hydration responses.
4. Capture keyboard-only, reduced-motion, 200% zoom, responsive-width, and major-stage screenshot evidence.
5. Complete the live preview/execution UX checkpoint with Person B only after backend readiness and organizer approval.

Definition-of-done gate:

```text
User can complete the full happy path without seeing raw developer/protocol output.
```

Detailed phase status is maintained in `docs/frontend-checkpoints.md`.

### Shared responsibility — All three developers

The PRD assigns integration contracts/types, end-to-end testing, README, architecture documentation, and hackathon submission compliance to the whole team. These are shared tasks, not additional developer roles.

Completed:

- Canonical contracts, database mappings, README, environment/setup documentation, safety boundaries, and architecture summary.
- Vitest coverage across contracts, API parsing, repository behavior, integrations, wallet controls, goal composition, reducer logic, and workflow panels.
- On 2026-09-01, `pnpm check` passed with **8 test files / 36 tests**, and `pnpm test:e2e` passed with **2 Chromium tests**.
- Automated GitHub Actions CI was intentionally removed at commit `a66c0b0`; validation is currently a local team responsibility.

Remaining tasks:

- Review proposed contract changes against PRD Section 17 and keep shared types canonical.
- Complete deterministic route tests and the remaining frontend error/recovery acceptance matrix.
- Run live Gonka/Thetanuts smoke checks and retain request IDs and market timestamps.
- Choose a Node.js 22 deployment target with persistent SQLite, or move the repository adapter to PostgreSQL for multi-instance/serverless deployment.
- Restore funded or hardened self-hosted CI when available.
- Audit the complete Git history before making the repository public; rotate any credential ever committed.
- Document AI tools, deploy and migrate the app, complete the live walkthrough, and prepare submission evidence.

## Recommended execution order

1. **Person A:** deliver ownership plus goal parse/edit/hydration routes.
2. **Person B:** deliver the deterministic Thetanuts candidate service; **Person A** exposes its canonical route.
3. **Person A:** deliver the three-role Gonka council and deterministic decision route.
4. **Person B:** deliver preview, revalidation, balances, cap, and unsigned transaction preparation; **Person A** integrates the route boundary.
5. **Persons A and B:** complete submission recording and receipt/protocol verification.
6. **Person C:** integrate each completed route and expand frontend acceptance coverage.
7. **All three:** run local acceptance, capture live sponsor evidence, perform the organizer-approved burner-wallet run, deploy, and review the submission.

Do not start live execution or mark P0 complete while any M5 safety gate or FE5/FE6 production verification remains blocked.
