# Getting Started

> Stub — the full setup walkthrough is written as features land. For now this
> covers only the environment mechanism established in Phase 0.5.

## Install & run

```bash
npm install
cp .env.example .env.local
npm run dev          # http://localhost:3000
```

## Checks

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint .
npm run format       # prettier --write .
```

## Test vs Production Environments (CLAUDE.md §12)

This template keeps a hard separation between a real environment and an isolated
test sandbox so AI-assisted or destructive operations can never touch real data.

- **`.env.local`** — your normal dev/prod-shaped credentials (copied from
  `.env.example`).
- **`.env.test`** — credentials for a **separate, isolated** test instance
  (test Supabase project / test MongoDB cluster), copied from
  `.env.test.example`. Never the same instance as dev or production.
- **`TEST_MODE=true`** — set in `.env.test`. At boot, `config/env.schema.ts`
  runs `assertTestEnvironmentSafety()`, which (from Phase 2 on) refuses to start
  unless the configured database clearly points at an allow-listed _test_
  instance. This is a deliberate speed bump against pointing a test run at
  production.
- **`npm run seed:test`** (Phase 2) will wipe and reseed the test database —
  safe to run repeatedly.

> Any agent asked to "test this" defaults to `.env.test` and should state which
> environment it's operating against before running anything destructive.

_Full per-feature setup guides (auth, database, payments, …) are added in their
respective phases._
