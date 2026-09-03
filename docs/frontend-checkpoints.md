# Frontend checkpoints

Last verified: **2026-09-02** against the current repository worktree.

GoalGuard P0 is a preview-only product. No reachable frontend state can prepare a live execution, request a signature, broadcast a transaction, or record a submission. The backend execution and submission routes remain unchanged and fail closed.

## Current state

| Area | Status | Evidence |
|---|---|---|
| Foundation and design system | **PASS** | Semantic purpose-cyber tokens, `next/font` typography, Phosphor icons, Motion transitions, 44px targets, focus states, reduced-motion rules, responsive shell, and `.agents`/`.codex` ESLint exclusions are implemented. |
| Goal entry and confirmation | **PASS (fixture-backed)** | Natural-language composer, clarification, durable goal navigation, grouped financial form, linked inline errors, focusable error summary, saved feedback, and “Find live protection” are wired to canonical routes. |
| Candidate search and approved plan | **PASS (fixture-backed)** | Truthful request-only activity state, deterministic live option facts, goal/cost/floor/expiry hierarchy, deadline-gap disclosure, direct-labelled scenario bars, semantic table equivalent, alternatives, and recovery are present. |
| Gonka council | **PASS (fixture-backed)** | Three differentiated role cards expose verdict, model, summary, concerns, disclosures, and copyable Gonka Request IDs in a keyboard-trapped drawer with focus restoration. |
| Preview confirmation | **PASS (fixture-backed)** | The reducer requires `confirming_preview` and an acknowledgment before `/api/trades/preview`; Back performs no mutation. Wallet and network changes reset acknowledgment and force a fresh confirmation. |
| Demo-ready result | **PASS (fixture-backed)** | “Protection Plan Ready (Demo),” the no-funds-moved disclosure, goal/option summary, wallet readiness, exact allowance, unsigned approval/execution data, Base chain ID, calldata, timestamp, countdown, decision reference, and all Gonka IDs are displayed. There is no signing CTA. |
| Reload and safety boundary | **PASS** | Browser storage never stores calldata. Hydrating a previewed trade returns to the approved plan with a fresh-preview explanation. Legacy execution client/storage/send helpers live under the unreferenced `src/features/live-execution` boundary. |
| Live sponsor verification | **BLOCKED / OUT OF P0** | Real Gonka and Thetanuts smoke runs require credentials. Live wallet execution requires separate organizer approval and is not part of this frontend. |

## Automated coverage

- Reducer stage order, required acknowledgment, acknowledgment reset, preview metadata retention, reload behavior, and absence of signing/broadcast stages.
- Canonical API error details and request metadata retention.
- Empty and incomplete goals, client financial validation, council role/request-ID rendering, and demo-ready signing-action absence.
- Full browser path from goal entry through demo-ready, including proof that preview is not requested before confirmation and `eth_sendTransaction` is never requested.
- Axe scans on landing, approved plan, council drawer, preview confirmation, and demo-ready.
- Keyboard Escape and drawer focus restoration.
- Landing overflow checks and animation-disabled screenshots at 375, 768, 1024, and 1440 pixels.

## Validation record

Record final command results here after each implementation pass:

```text
pnpm lint: PASS
pnpm typecheck: PASS
pnpm test: PASS (16 files, 77 tests)
pnpm build: PASS (Next.js 16.3.3 Turbopack)
pnpm test:e2e: PASS (4 Chromium tests)
Node runtime: PASS on Node.js 22.19.0
Known external blockers: live Gonka/Thetanuts smoke verification requires credentials; live execution is outside P0
```

The Playwright workflow uses deterministic canonical fixtures. It verifies browser behavior and safety boundaries, not live sponsor availability or production market data.
