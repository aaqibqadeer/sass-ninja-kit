# Choosing a Database

The template ships two database adapters behind one interface (see
`docs/architecture/data-layer.md`). Pick **one** provider per project by setting
`DB_PROVIDER`; app code doesn't change either way.

```env
DB_PROVIDER=supabase   # or: mongodb
```

On a real fork, after choosing, delete the unused adapter folder
(`lib/db/supabase` or `lib/db/mongodb`) and its `case` in `lib/db/index.ts`
(CLAUDE.md §1.5).

---

## Option A — Supabase (Postgres)

### Env vars

```env
DB_PROVIDER=supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon public key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # server-only, used by the adapter/seed
```

All three are required at boot when `DB_PROVIDER=supabase` (validated in
`config/env.schema.ts`).

### Local development (Supabase CLI)

```bash
# Install the CLI: https://supabase.com/docs/guides/cli
supabase init          # once, creates supabase/ config
supabase start         # spins up local Postgres + APIs in Docker
supabase status        # prints local URL + anon/service keys → put them in .env.local
```

Create the tables (`users`, `organizations`, `organization_members`) and their
row-level-security policies as a migration under `supabase/migrations`. The
adapter expects snake_case columns (`created_at`, `organization_id`, …) and
tenant-scoped RLS keyed on `organization_id`.

> SQL migration + RLS policy files are **deferred to a later phase**; for now
> create the schema to match `lib/db/schema.ts` and the row shapes in
> `lib/db/supabase/adapter.ts`.

### Test instance

Create a **separate** Supabase project for tests and put its URL in `.env.test`.
With `TEST_MODE=true`, boot refuses to start unless the URL matches
`TEST_DB_PATTERN` (default `/test/i`) — see `docs/guides/getting-started.md`.

---

## Option B — MongoDB (Mongoose)

### Env vars

```env
DB_PROVIDER=mongodb
MONGODB_URI=mongodb://localhost:27017/ninjakit
```

`MONGODB_URI` is required at boot when `DB_PROVIDER=mongodb`.

### Local development (docker-compose)

A ready-to-use MongoDB service is provided in `docker-compose.yml` at the repo
root:

```bash
docker compose up -d mongo      # starts MongoDB on localhost:27017
docker compose down             # stop it
```

Then set `MONGODB_URI=mongodb://localhost:27017/ninjakit` in `.env.local`.

The adapter (`lib/db/mongodb/adapter.ts`) defines the Mongoose schemas with
`organization_id` indexed on tenant-scoped collections and a unique
`(organization_id, user_id)` index on memberships. Collections are created on
first write — no migration step needed.

### Test instance

Use a separate database name/cluster with a `-test` marker (e.g.
`mongodb://localhost:27017/ninjakit-test`) so the `TEST_MODE` guardrail passes.

---

## Seeding

Once a provider and its env are configured:

```bash
pnpm seed      # or: npm run seed
```

This creates one test organization, one admin user, and one regular user via the
selected adapter (`scripts/seed.ts`). Run it against an empty database.
