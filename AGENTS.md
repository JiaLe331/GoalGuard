# AGENTS.md

## Scope

- These instructions apply to the whole repository.
- Read a deeper `AGENTS.md` first if a future subproject adds one.
- Treat `goalguard_prd.md`, especially Section 17, as the normative product and contract specification.
- Treat `DESIGN_SYSTEM.md` as the frontend visual and interaction source of truth after the PRD's product, safety, and contract requirements.

## Current State

- This is a Next.js 16 App Router project using strict TypeScript, Tailwind CSS, pnpm, Drizzle, and Supabase PostgreSQL.
- The P0 API routes, deterministic Thetanuts strategy engine, Gonka council, anonymous session ownership, and Render trade-monitor worker are implemented.
- Test fixtures may simulate financial records only inside unit/component/Playwright tests; production components must stop safely when an API is absent.
- Vercel hosts the same-origin UI/API; Render hosts only the background trade monitor. Node.js 22 is the supported runtime.

## Setup

- Use `pnpm`; keep `pnpm-lock.yaml` synchronized with `package.json`.
- Run `pnpm install`, copy `.env.example` to `.env.local`, then run `pnpm db:migrate`.
- Telegram is opt-in: after an HTTPS deployment exists, configure the server-only values and run `pnpm telegram:setup`, then verify with `pnpm telegram:check`; neither command belongs in startup, migration, build, or test workflows.
- Never commit `.env*`, database credentials, API keys, private keys, or wallet secrets.

## Validation

- Run `pnpm lint` after source or config changes.
- Run `pnpm typecheck` after TypeScript changes.
- Run `pnpm test` after contracts, repository, components, or service changes.
- Run `pnpm build` after app, route, dependency, or environment changes.
- Run `pnpm test:e2e` for user-visible flow changes.
- Live `smoke:*` commands are opt-in and require local credentials; never substitute mocked results in the product.

## Style

- Keep route handlers thin; domain and integration logic belongs under `src/lib`.
- Keep frontend requests in the typed API client and parse every response with shared Zod contracts.
- Browser storage may hold a draft, active goal ID, and retry metadata only; server records remain authoritative.
- Validate external and persistence boundaries with the shared Zod contracts.
- Use decimal strings and base-unit strings across boundaries; never use floating point for financial values.
- Keep database column names inside the schema and `db-mappers.ts`.
- Keep Gonka and Thetanuts modules server-only. Return allowlisted summaries, not raw payloads.

## Contribution Rules

- Preserve explicit user approval and `ENABLE_LIVE_THETANUTS_EXECUTION=false` unless organizer permission is documented.
- Do not invent sponsor methods, model IDs, protocol addresses, prices, or transaction state.
- Generate migrations with `pnpm db:generate`; inspect and commit schema and migration changes together.
- Use `DATABASE_URL` for pooled runtime access and `DATABASE_DIRECT_URL` for migrations; never run migrations at application or worker startup.
- Preserve audit IDs, request IDs, transaction hashes, and completed reviews once written.

## Maintenance

- Update this file when setup, validation, build, database, or contribution workflows change.
- Keep instructions tied to commands present in `package.json`. Automated CI is currently not configured, so validation must be run locally before committing.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
