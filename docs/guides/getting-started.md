# Getting Started

Bring a fresh clone of ninjakit up to a running app. For starting a **new
product** from the template (choosing providers/flags), use the master prompt in
`docs/prompts/scaffold-new-saas.md`. New here? Read
`docs/knowledge-base/current-state.md` first — it says what's built and which
flags this fork actually uses.

## 1. Prerequisites

- Node 20+ and **pnpm** (the repo's package manager — scripts assume it).
- A database: a **Supabase** project _or_ a **MongoDB** instance. For local
  Mongo, `docker-compose.yml` is included (`docker compose up -d`). See
  `docs/guides/choosing-database.md`.

## 2. Install

```bash
pnpm install
cp .env.example .env.local
```

## 3. Configure `.env.local`

At minimum set the database (always required) and the app URL:

```env
DB_PROVIDER=supabase            # or: mongodb
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase (when DB_PROVIDER=supabase):
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
# MongoDB (when DB_PROVIDER=mongodb):
# MONGODB_URI=mongodb://localhost:27017/ninjakit

# First platform super-admin (promoted during seeding, §14):
SUPER_ADMIN_EMAIL=you@example.com
```

Then turn on only the features you want via `NEXT_PUBLIC_FEATURE_*` toggles and
add each one's required secrets. `config/features.ts` lists the flags,
`config/env.schema.ts` enforces the secrets, and
`docs/architecture/feature-flags.md` maps flag → required vars. **Everything is
off by default** — an unset flag degrades to "not rendered / not routable", never
a broken page.

> Env is validated at boot: the app throws and names any required var that's
> missing for an enabled flag. To build/CI without secrets, set
> `SKIP_ENV_VALIDATION=1`.

## 4. Seed

```bash
pnpm seed        # creates sample orgs/users/plans; promotes SUPER_ADMIN_EMAIL
```

Seeded logins use password `Password123!` (e.g. `admin@example.com`,
`user@example.com`) so email/password sign-in works immediately (when that flag
is on).

## 5. Run

```bash
pnpm dev         # http://localhost:3000
```

## 6. Quality gates

```bash
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint .
pnpm format      # prettier --write .
pnpm build       # production build
```

## Test vs production environments (CLAUDE.md §12)

The template keeps a hard separation between real credentials and an isolated
test sandbox so AI-assisted or destructive work can never touch real data.

- **`.env.local`** — your normal dev credentials.
- **`.env.test`** — a **separate, isolated** test instance (copy from
  `.env.test.example`). Never the same instance as dev/prod.
- **`TEST_MODE=true`** (in `.env.test`) makes `config/env.schema.ts` run
  `assertTestEnvironmentSafety()` at boot, which refuses to start unless the DB
  target matches the `TEST_DB_PATTERN` allow-list — a speed bump against pointing
  a test run at production.
- `scripts/seed-test.ts` (`pnpm seed:test`) is intended to wipe+reseed the test
  DB idempotently; its body is currently a **stub** (see current-state.md).

> Any agent asked to "test this" should default to `.env.test` and state which
> environment it's operating against before running anything destructive.

## Next steps

Per-feature setup lives in `docs/guides/`: `auth-setup.md`,
`choosing-database.md`, `multi-tenancy.md`, `payments-setup.md`,
`storage-phone-email.md`, `ai-providers.md`. To deploy, see `deployment.md`.
