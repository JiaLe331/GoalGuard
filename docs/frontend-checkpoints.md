# Frontend checkpoints

Last verified: **2026-09-03** on `feat/frontend-fe7-main-integration`, based on `origin/main` at `1c34f43`.

GoalGuard P0 is a preview-only product. No reachable frontend state can prepare a live execution, request a signature, broadcast a transaction, or record a submission. The backend execution and submission routes remain unchanged and fail closed.

## Current state

| Area | Status | Evidence |
|---|---|---|
| Foundation and design system | **PASS** | The purpose-tech editorial system in `DESIGN_SYSTEM.md` is implemented with a warm white canvas, near-black financial surfaces, acid-lime emphasis, Manrope typography, Phosphor icons, restrained Motion transitions, 44px targets, visible focus, reduced-motion rules, and responsive shells. |
| Goal entry and confirmation | **PASS (fixture-backed)** | Natural-language composer, clarification, durable goal navigation, grouped financial form, linked inline errors, focusable error summary, saved feedback, and “Find live protection” are wired to canonical routes. |
| Candidate search and approved plan | **PASS (fixture-backed)** | Truthful request-only activity state, deterministic live option facts, goal/cost/floor/expiry hierarchy, deadline-gap disclosure, direct-labelled scenario bars, semantic table equivalent, alternatives, and recovery are present. |
| Gonka council | **PASS (fixture-backed)** | Three differentiated role cards expose verdict, model, summary, concerns, disclosures, and copyable Gonka Request IDs in a keyboard-trapped drawer with focus restoration. |
| Preview confirmation | **PASS (fixture-backed)** | The reducer requires `confirming_preview` and an acknowledgment before `/api/trades/preview`; Back performs no mutation. Wallet and network changes reset acknowledgment and force a fresh confirmation. |
| Demo-ready result | **PASS (fixture-backed)** | “Protection Plan Ready (Demo),” the no-funds-moved disclosure, goal/option summary, wallet readiness, exact allowance, unsigned approval/execution data, Base chain ID, calldata, timestamp, countdown, decision reference, and all Gonka IDs are displayed. There is no signing CTA. |
| Reload and safety boundary | **PASS** | Browser storage never stores calldata. Hydrating a previewed trade returns to the approved plan with a fresh-preview explanation. Legacy execution client/storage/send helpers live under the unreferenced `src/features/live-execution` boundary. |
| Backend-free interface review | **PASS (development only)** | `/dev/ui-preview` loads canonical fixtures only after a development-environment guard and renders the production panels across 15 URL-addressable states. It performs no API, wallet, storage, signing, or broadcast request and is `noindex`; production returns 404. |
| Live sponsor verification | **BLOCKED / OUT OF P0** | Real Gonka and Thetanuts smoke runs require credentials. Live wallet execution requires separate organizer approval and is not part of this frontend. |

## Checkpoint branch audit and integration

The checkpoint branches are cumulative, so FE7 contains FE0, FE1, FE2, and FE4. The integration therefore merged only `origin/feat/frontend-fe7-acceptance` into current `origin/main` with a merge commit; the checkpoint branches remain unchanged.

| Checkpoint | Tip | Result at branch tip |
|---|---:|---|
| `feat/frontend-fe0-foundation` | `064b1eb` | Foundation complete; typecheck and 72 tests passed. |
| `feat/frontend-fe1-goal-entry` | `e8e84be` | Goal entry complete and fixture-backed; typecheck and 72 tests passed. |
| `feat/frontend-fe2-plan-council` | `4611187` | Plan, council, confirmation, and demo result complete; typecheck and 77 tests passed. |
| `feat/frontend-fe4-preview-safety` | `8f76236` | Preview-only safety boundary complete; typecheck and 78 tests passed. |
| `feat/frontend-fe7-acceptance` | `7c2185a` | Purpose-tech visual pass and its 17-file acceptance checkpoint complete; typecheck and 80 tests passed. |

Integration commit `36ab1d1` preserves `main`'s canonical `coverageMode`, unsigned-preview purpose/proposal, Thetanuts SDK 0.3.0, primary/fallback RPC configuration, database migration, and fail-closed routes while retaining FE7's complete presentation and preview-only workflow.

## Development UI preview

Run `pnpm dev`, then open [http://localhost:3000/dev/ui-preview](http://localhost:3000/dev/ui-preview). Use the labelled state selector or Previous/Next controls to inspect goal confirmation, both truthful loading stages, all council outcomes, the council drawer, preview confirmation and generation, demo-ready data, wallet insufficiency, safe failures, and reload recovery.

The yellow development notice is persistent. Values edited in the goal form live only in the current React session. State selection is reflected in `?state=…` for shareable local URLs, but it does not use the API, browser storage, a wallet provider, signing, or broadcasting. The route is intentionally absent from production navigation and returns 404 outside `next dev`.

## Automated coverage

- Reducer stage order, required acknowledgment, acknowledgment reset, preview metadata retention, reload behavior, and absence of signing/broadcast stages.
- Canonical API error details and request metadata retention.
- Empty and incomplete goals, client financial validation, council role/request-ID rendering, and demo-ready signing-action absence.
- Full browser path from goal entry through demo-ready, including proof that preview is not requested before confirmation and `eth_sendTransaction` is never requested.
- Axe scans on landing, approved plan, council drawer, preview confirmation, and demo-ready.
- Keyboard Escape and drawer focus restoration.
- Landing overflow checks and animation-disabled screenshots at 375, 768, 1024, 1280, and 1440 pixels, including a single-line navbar CTA assertion at 1280px.
- All 15 development preview states without backend or wallet traffic, plus a production-environment gate and canonical fixture-schema validation.

## Validation record

Record final command results here after each implementation pass:

```text
pnpm lint: PASS
pnpm typecheck: PASS
pnpm test: PASS (25 files, 129 tests)
pnpm build: PASS (Next.js 16.3.3 Turbopack)
pnpm test:e2e: PASS (5 Chromium tests)
Node runtime: PASS on Node.js 22.19.0
Known external blockers: live Gonka/Thetanuts smoke verification requires credentials; live execution is outside P0
```

The Playwright workflow uses deterministic canonical fixtures. It verifies browser behavior and safety boundaries, not live sponsor availability or production market data.
