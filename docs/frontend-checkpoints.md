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
| FE4 Unsigned preview and confirmation | **IMPLEMENTED / BLOCKED** | Wallet/Base read-only requirements, exact cost, readiness, idempotent preview, warnings, and quote countdown are integrated. The terminal CTA must generate an unsigned preview. | Client and repository tests cover preview idempotency and current-record constraints; Playwright covers preview-only UX. | Run the read-only `smoke:workflow` path and add browser wallet/network failure cases. |
| FE5 Signing and submission | **OUT OF SCOPE / DORMANT** | Future compatibility code may remain server-side, but the submitted demo exposes no approval, signing, send, or submission action. | The policy requires execute and submission routes to return `422 EXECUTION_DISABLED`. | Do not implement this checkpoint during the hackathon demo. |
| FE6 Demo-ready state and polish | **IMPLEMENTED / BLOCKED** | Canonical hydration mapping, council audit references, focus management, safe external links, responsive layouts, non-color statuses, and preview-only accessibility coverage exist. | Landing and preview-only axe scans report no serious/critical violations. | Add the terminal unsigned-preview wording, keyboard-only evidence, reduced-motion and 200% zoom checks, responsive screenshots, and full accessibility scans. |
| FE7 Full acceptance and handoff | **PARTIAL / BLOCKED** | The deterministic local suite and preview-only production limitations are documented; CI is intentionally not configured. | On 2026-09-02, lint, type-check, **16 Vitest files / 72 tests**, webpack production build, and **3 Chromium tests** passed. | Run read-only sponsor smoke tests, deploy, and capture unsigned-preview evidence. |

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
Wallet signing/broadcast: OUT OF SCOPE; the submitted demo ends at an unsigned preview
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
- Draft hydration and the terminal preview-only state.
- Approved/disputed/blocked reducer mapping, council role/request-ID display, and signing-CTA suppression.

## Acceptance coverage still required

- Multi-turn clarification and editable refresh against the real goal API.
- No-suitable-candidate, constraint editing, stale candidate, and Thetanuts failure paths.
- Disputed and blocked council decisions, malformed reviews, and explicit retry attempts.
- Quote expiry, wallet rejection, account/network invalidation, balance/cap failures, and allowance-preview variants.
- Terminal unsigned-preview idempotency, refresh, and the mandatory no-signature/no-funds/no-position disclosure.
- Keyboard-only happy path, reduced motion, 200% zoom, all required responsive widths, and screenshots for every major stage.
- Live-data/read-only sponsor evidence and the unsigned-preview walkthrough.

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

`ENABLE_LIVE_THETANUTS_EXECUTION=false` is fixed for the submitted and demonstrated build; it is not an organizer-approval switch. The frontend must never request a signature or broadcast. A demo preview is not a transaction or protected position.
