# Frontend checkpoints

Last verified: **2026-09-02** against the current local backend integration worktree.

This file cross-checks the GoalGuard P0 frontend against the approved FE0-FE7 plan. A screen being implemented with deterministic test fixtures does not pass a production checkpoint by itself. The checkpoint passes only when its gate is verified against the canonical backend behavior required by the plan.

## Status definitions

- **PASS:** the checkpoint gate is satisfied with current repository evidence.
- **IMPLEMENTED / BLOCKED:** the frontend implementation exists, but its production gate depends on missing backend or live verification.
- **PARTIAL:** required frontend implementation or test coverage is still missing.

## Current checkpoint status

| Checkpoint | Status | Implemented frontend result | Verified evidence | Remaining gate or coverage gap |
|---|---|---|---|---|
| FE0 Foundation | **PASS** | Design tokens, reusable primitives, typed API client, safe API errors, reducer, formatters, guarded browser ownership, server capabilities, shared wallet provider, workspace shell, and route error boundary. | API client rejects malformed success responses and preserves canonical errors; reducer, wallet, contracts, lint, type-check, build, landing Playwright, and axe checks pass. Test fixtures are isolated under `src/test` and `e2e`. | Keep FE0 stable while integrating production routes. |
| FE1 Goal entry and confirmation | **IMPLEMENTED / BLOCKED** | Natural-language submission, clarification, durable navigation, editing, validation, abort support, and draft preservation are implemented against production routes. | Component tests plus backend parsing, ownership, and persistence tests pass. | Run multi-turn clarification against real Gonka and hosted Supabase. |
| FE2 Candidate search and plan | **IMPLEMENTED / BLOCKED** | Live request progress, ranked plans, scenarios, refresh, and refusal surfaces are connected to the production candidate route. | Deterministic strategy tests cover exact math, full coverage, ranking inputs, and invalid order direction. | Run the real Thetanuts smoke path and expand browser failure cases. |
| FE3 GoalGuard council | **IMPLEMENTED / BLOCKED** | Three role cards, verdicts, disclosures, model names, Request IDs, retry control, and trade gating use the production council route. | Service tests cover independent calls, two models, matching-input cache reuse, and failed-role blocking. | Record three real Gonka Request IDs and expand disputed/blocked browser cases. |
| FE4 Trade preview and confirmation | **IMPLEMENTED / BLOCKED** | Wallet/Base requirements, exact cost, readiness, idempotent preview, warnings, quote countdown, and disabled-execution behavior are integrated. | Client and repository tests cover preview idempotency and current-record constraints; Playwright covers preview-only UX. | Run `smoke:workflow` with a public funded wallet and add browser wallet failure cases. |
| FE5 Wallet execution and lifecycle | **IMPLEMENTED / BLOCKED** | Distinct durable retry keys, exact approval sequencing, explicit wallet actions, submission retry, polling, and recovery are connected to production routes. | Transaction matching and monitor tests cover mismatch, revert, index delay, and verified confirmation. | Keep disabled until organizer approval; later complete one capped burner-wallet transaction. |
| FE6 Protected state, recovery, and polish | **IMPLEMENTED / BLOCKED** | Canonical hydration mapping, interrupted-signature recovery, submitted polling, protected summary, explorer link, council audit references, focus management, safe external links, responsive layouts, and non-color statuses exist. | Draft hydration and submitted-not-protected reducer tests pass; landing and preview-only axe scans report no serious/critical violations. | Verify every persisted goal/trade status against real `GET` responses. Add protected/failed/pending browser paths, keyboard-only evidence, reduced-motion and 200% zoom checks, responsive screenshots at all required widths, and a full automated accessibility scan for each major stage. |
| FE7 Full acceptance and handoff | **PARTIAL / BLOCKED** | The deterministic local suite and production limitations are documented; CI is intentionally not configured. | On 2026-09-02, lint, type-check, **16 Vitest files / 72 tests**, webpack production build, and **3 Chromium tests** passed. | Run sponsor smoke tests, deploy, obtain organizer approval, and complete one capped burner-wallet transaction. |

## Current validation record

```text
Date: 2026-09-02
Baseline: current local backend integration worktree
pnpm lint: PASS
pnpm typecheck: PASS
pnpm test: PASS (16 files, 72 tests)
pnpm exec next build --webpack: PASS (`pnpm build` Turbopack is blocked by this sandbox's process-binding policy)
pnpm test:e2e: PASS (3 Chromium tests)
CI: NOT CONFIGURED; validation was run locally
Gonka live smoke: NOT RUN
Thetanuts live smoke: NOT RUN
Live wallet execution: BLOCKED by the disabled feature flag and organizer approval
```

The Playwright workflow intercepts `/api/**` with deterministic canonical fixtures. It proves browser wiring and schema-compatible presentation through preview-only, but it is not evidence that live sponsor flows work.

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
