# Frontend checkpoints

This file is the cross-check record for the GoalGuard P0 frontend. Update the evidence column when a phase is reviewed against a real backend or live sponsor environment.

| Checkpoint | Implemented result | Automated evidence | Remaining external dependency |
|---|---|---|---|
| FE0 Foundation | Design tokens, primitives, typed API client, reducer, formatters, local ownership guard, capabilities, shared wallet provider, and route error boundary. | API client, reducer, M1 landing, type, lint, and build checks. | None. |
| FE1 Goal flow | Natural-language submit, one-question clarification, durable navigation, editable confirmation, local validation, and draft preservation. | Goal composer and confirmation component tests; Playwright happy path. | `POST /api/goals/parse`, `PATCH /api/goals/{id}`, and `GET /api/goals/{id}`. |
| FE2 Candidates | Honest request-driven progress, selected plan, ranked alternatives, scenarios, protocol details, refresh, and no-candidate recovery. | Contract fixtures and Playwright candidate flow. | `POST /api/protection/candidates`. |
| FE3 Council | Three independent role cards, verdicts, concerns, disclosures, model names, Request IDs, and approved/disputed/blocked gates. | Reducer status matrix and council component test. | `POST /api/council/review`. |
| FE4 Preview | Base-wallet requirement, exact cost/expiry/limitations, warnings, quote countdown, partial-coverage disclosure, and disabled-execution state. | Preview component and Playwright preview-only test. | `POST /api/trades/preview`. |
| FE5 Execution | Idempotency retry record, exact approval before execution, explicit wallet prompts, broadcast preservation, submission retry, four-second polling, and pending timeout. | Reducer safety tests and wallet tests. | Execution flag approval plus execute/submission/trade APIs and real wallet QA. |
| FE6 Recovery | Canonical goal hydration, status mapping, interrupted-signature handling, submitted polling, protected card, explorer link, council audit references, focus management, and responsive layouts. | Hydration reducer tests, build, Playwright, and browser QA. | Backend session ownership and confirmed receipt/position verification. |
| FE7 Handoff | CI-safe deterministic suite and documented production limitations. | `pnpm check` and `pnpm test:e2e`. | Organizer approval, burner wallet, sponsor credentials, deployed live walkthrough. |

## Review evidence template

Record this for each review:

```text
Checkpoint:
Commit:
Reviewer:
Commands passed:
Desktop/mobile screenshots:
API request IDs exercised:
Known blockers:
Gate result: PASS / BLOCKED
```

Live execution must remain **BLOCKED** until organizer approval is retained, the server capability is enabled, and the premium cap is verified with a burner wallet.
