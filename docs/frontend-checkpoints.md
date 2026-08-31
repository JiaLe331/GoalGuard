# Frontend checkpoints

Last verified: **2026-09-01** against baseline commit `a66c0b0`.

This file cross-checks the GoalGuard P0 frontend against the approved FE0-FE7 plan. A screen being implemented with deterministic test fixtures does not pass a production checkpoint by itself. The checkpoint passes only when its gate is verified against the canonical backend behavior required by the plan.

## Status definitions

- **PASS:** the checkpoint gate is satisfied with current repository evidence.
- **IMPLEMENTED / BLOCKED:** the frontend implementation exists, but its production gate depends on missing backend or live verification.
- **PARTIAL:** required frontend implementation or test coverage is still missing.

## Current checkpoint status

| Checkpoint | Status | Implemented frontend result | Verified evidence | Remaining gate or coverage gap |
|---|---|---|---|---|
| FE0 Foundation | **PASS** | Design tokens, reusable primitives, typed API client, safe API errors, reducer, formatters, guarded browser ownership, server capabilities, shared wallet provider, workspace shell, and route error boundary. | API client rejects malformed success responses and preserves canonical errors; reducer, wallet, contracts, lint, type-check, build, landing Playwright, and axe checks pass. Test fixtures are isolated under `src/test` and `e2e`. | Keep FE0 stable while integrating production routes. |
| FE1 Goal entry and confirmation | **IMPLEMENTED / BLOCKED** | Natural-language submission, category mapping, one-question clarification, durable navigation, editable confirmation, local validation, double-submit prevention, abort support, and draft preservation are implemented. | Goal composer tests cover empty input, incomplete clarification, and durable navigation. The Playwright happy path parses and hydrates through schema-valid intercepted responses. | Implement and verify `POST /api/goals/parse`, `PATCH /api/goals/{goalId}`, and `GET /api/goals/{goalId}` with Gonka, persistence, ownership, conflicts, timezone/date validation, and refresh equality. Multi-turn clarification is not yet covered end to end in Playwright. |
| FE2 Candidate search and plan | **IMPLEMENTED / BLOCKED** | Real request-bound progress, selected plan, alternatives, scenario presentation, technical details, freshness, refresh, and no-candidate recovery surfaces exist without production fixture imports. | The preview-only Playwright path consumes schema-valid candidate data and preserves backend order. Contract validation covers canonical decimals/entities. | Implement `POST /api/protection/candidates` with live Thetanuts data and deterministic selection. Add browser cases for no candidate, each rejection class, provider outage, stale refresh, mismatched selection, and extreme decimals. |
| FE3 GoalGuard council | **IMPLEMENTED / BLOCKED** | Exactly three role cards, verdicts, concerns, disclosures, model names, Request IDs, deterministic decision status, retry control, and trade gating are represented. | Reducer tests distinguish approved, disputed, and blocked states; a component test confirms all roles and request IDs; the Playwright happy path displays a 3/3 approved decision. | Implement `POST /api/council/review`, persistence, and deterministic consensus with live Gonka. Add explicit disputed/blocked screen, duplicate/missing role, malformed response, missing request ID, outage, and retry-attempt UI tests. |
| FE4 Trade preview and confirmation | **IMPLEMENTED / BLOCKED** | Wallet/Base requirements, exact cost and limitations, warnings, quote countdown, acknowledgment, preview invalidation, partial-coverage disclosure, and preview-only capability gate exist. | Wallet tests cover unavailable injection, explicit connect, and Base switching. Component/Playwright tests prove disabled execution renders no signing CTA. | Implement `POST /api/trades/preview`. Add coverage for wallet rejection, switch failure, quote expiry, account/chain change, stale candidate/decision, premium cap, balances, allowance variants, and gas display. |
| FE5 Wallet execution and lifecycle | **IMPLEMENTED / BLOCKED** | Idempotency retry metadata, execution preparation, exact approval-before-execution sequencing, explicit wallet actions, hash preservation, submission retry, four-second polling, two-minute pending handling, and reload recovery code exist. | Reducer testing proves a submitted hash is not treated as protected. Existing wallet tests validate connection boundaries, but no automated test executes the approval/submission sequence. | Implement execute, submission, and trade-status APIs; enable only with organizer approval. Add tests for both signatures, rejection/revert, one logical trade, recording failure/retry, stale/expired recovery, polling, RPC failure, reload, and backend-verified confirmation. |
| FE6 Protected state, recovery, and polish | **IMPLEMENTED / BLOCKED** | Canonical hydration mapping, interrupted-signature recovery, submitted polling, protected summary, explorer link, council audit references, focus management, safe external links, responsive layouts, and non-color statuses exist. | Draft hydration and submitted-not-protected reducer tests pass; landing and preview-only axe scans report no serious/critical violations. | Verify every persisted goal/trade status against real `GET` responses. Add protected/failed/pending browser paths, keyboard-only evidence, reduced-motion and 200% zoom checks, responsive screenshots at all required widths, and a full automated accessibility scan for each major stage. |
| FE7 Full acceptance and handoff | **PARTIAL / BLOCKED** | The deterministic local suite and production limitations are documented; CI is intentionally not configured. | On 2026-09-01, `pnpm check` passed: lint, type-check, **8 Vitest files / 36 tests**, and production build. `pnpm test:e2e` passed **2 Chromium tests**: landing and fixture-backed goal-to-preview-only. | Automate the remaining acceptance scenarios, integrate all production routes, record checkpoint artifacts, run sponsor smoke tests, deploy, obtain organizer approval, and complete one capped burner-wallet transaction. |

## Current validation record

```text
Date: 2026-09-01
Baseline commit: a66c0b0
pnpm lint: PASS
pnpm typecheck: PASS
pnpm test: PASS (8 files, 36 tests)
pnpm build: PASS
pnpm test:e2e: PASS (2 Chromium tests)
CI: NOT CONFIGURED; validation was run locally
Gonka live smoke: NOT RUN
Thetanuts live smoke: NOT RUN
Live wallet execution: BLOCKED by missing backend routes, disabled feature flag, and organizer approval
```

The Playwright workflow intercepts `/api/**` with deterministic canonical fixtures. It proves browser wiring and schema-compatible presentation through preview-only, but it is not evidence that the missing production APIs or live sponsor flows work.

## Automated coverage present

- Landing shell, integration readiness presentation, and serious/critical accessibility scan.
- Complete fixture-backed goal-to-approved-plan-to-preview-only happy path.
- Empty goal input, incomplete goal draft preservation, and durable-goal navigation at component level.
- Malformed API success rejection and canonical API error preservation.
- Contract strictness, council role uniqueness, and API envelope validation.
- Wallet absence, explicit connection, and Base switch offer.
- Database goal round trip and forward-only goal transitions.
- Draft hydration and the rule that a submitted hash alone is not protection.
- Approved/disputed/blocked reducer mapping, council role/request-ID display, and disabled-execution signing-CTA suppression.

## Acceptance coverage still required

- Multi-turn clarification and editable refresh against the real goal API.
- No-suitable-candidate, constraint editing, stale candidate, and Thetanuts failure paths.
- Disputed and blocked council decisions, malformed reviews, and explicit retry attempts.
- Quote expiry, wallet rejection, account/network invalidation, balance/cap failures, and allowance variants.
- Approval then execution ordering, submission recovery, idempotency conflicts, pending/failed/confirmed polling, and reload during each transaction stage.
- Protected-state rendering from a backend-verified receipt and protocol position.
- Keyboard-only happy path, reduced motion, 200% zoom, all required responsive widths, and screenshots for every major stage.
- Live sponsor evidence and the organizer-approved capped burner-wallet walkthrough.

## Review evidence template

Record this for each production checkpoint review:

```text
Checkpoint:
Commit:
Reviewer:
Commands passed:
Desktop/mobile screenshots:
API contracts exercised:
Gonka request IDs / Thetanuts market timestamp:
Known blockers:
Gate result: PASS / BLOCKED
```

Live execution must remain **BLOCKED** until organizer approval is recorded, sponsor integrations are ready, the server capability is enabled, and the premium cap is verified with a burner wallet. A client-submitted transaction hash alone must never pass FE5 or FE6.
