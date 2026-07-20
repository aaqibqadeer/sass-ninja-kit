# sass-ninja-kit
[sass-ninja-ajlh0gg6x-aaqibqadeers-projects.vercel.app](sass-ninja-ajlh0gg6x-aaqibqadeers-projects.vercel.app)

A reusable, **multi-tenant SaaS boilerplate template** — infrastructure meant to
be cloned/forked for many future SaaS projects, not a single product.

**Stack:** Next.js 15 (App Router) · TypeScript · TailwindCSS · shadcn/ui · Vercel.

---

## Branches & phases

Development is split into phases. Each phase lives on its own branch, cut from
the previous phase's branch, so a later branch cumulatively contains all earlier
work.

| Branch                  | Contains                                                                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `phase-0-foundation`    | Project scaffold, shadcn/ui, folder structure, docs skeleton, CI-lite scripts.                                                                                               |
| `phase-0.5-foundations` | Everything above **+** linting/Prettier, theme skeleton, component catalog, knowledge base, test-env guardrail, full folder contract.                                        |
| `phase-1-config-flags`  | Everything above **+** typed feature-flag registry, flag-aware env validation, full `.env.example`, feature-flags reference.                                                 |
| `phase-2-db-adapter`    | Everything above **+** database adapter interface, Supabase + MongoDB adapters, provider selector, multi-tenant schema, seed script, docker-compose.                         |
| `phase-3-auth-core`     | Everything above **+** auth interface (Supabase Auth / custom JWT+bcrypt), email-password + reset, magic link, Google/GitHub OAuth, auth UI, middleware, seeded credentials. |

> You are on **`phase-3-auth-core`**.

---

## Phase 0 — Foundation

What this phase sets up:

- **Next.js 15 App Router** project (TypeScript, TailwindCSS v4, ESLint).
- **shadcn/ui** configured (`components.json`, `lib/utils.ts`, theme in
  `app/globals.css`) with four base components: `button`, `card`, `input`,
  `label`. The home page (`app/page.tsx`) is a smoke test proving they render.
- **Folder structure** for the boilerplate:
  - `config/features.ts` — central feature-flag registry (empty shape; flags
    added per phase).
  - `components/ui/` — shadcn components.
  - `lib/`, `types/` — shared utilities and types.
  - `docs/` — `README.md` index plus `architecture/`, `guides/`, `prompts/`,
    `llm-context/`, `legal-templates/`.
- **Project docs:** `CLAUDE.md`, `.cursorrules`, and
  `docs/architecture/overview.md` (flag-driven + adapter philosophy).
- **CI-lite scripts:** `npm run typecheck` and `npm run lint` must both pass.

### Getting started

```bash
npm install
cp .env.example .env.local   # no vars needed yet in Phase 0
npm run dev                  # http://localhost:3000
```

### Checks

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint .
npm run format       # prettier --write .
```

---

## Phase 0.5 — Foundations

Conventions, tooling, and living docs that every future phase must follow. No
features. Adds on top of Phase 0:

- **Linting & formatting** — ESLint (`next/core-web-vitals` + `next/typescript`),
  Prettier, and `eslint-config-prettier`; `format`/`format:check` scripts.
- **Folder contract** — full skeleton per `CLAUDE.md` §3:
  `components/shared`, `lib/{db,auth,storage,email,phone,ai}` (with
  `lib/db/{supabase,mongodb}` and `lib/db/adapter.ts` stub), `scripts/`
  (`seed.ts`, `seed-test.ts` stubs), `docs/knowledge-base/`.
- **Theme system** — `config/theme.ts` (typed token source of truth) mirrored
  into `app/globals.css`; class-based dark mode; `docs/architecture/theming.md`.
- **Component catalog** — `docs/architecture/components.md` (button, card,
  input, label tracked from day one).
- **Knowledge base** — `docs/knowledge-base/{current-state,decisions,glossary}.md`.
- **Test-env guardrail** — `.env.test.example`, `config/env.schema.ts`
  (`TEST_MODE` + `assertTestEnvironmentSafety()` scaffold),
  `docs/guides/getting-started.md`.
- **Governing rulebook** — full `CLAUDE.md` project rulebook at repo root.

The theme was adapted to Tailwind v4 (CSS-first, no `tailwind.config.ts`) — see
`docs/knowledge-base/decisions.md`.

---

## Phase 1 — Config & Feature Flags

The config/flag skeleton every later feature reads from. No auth/db/payment
logic. Adds on top of Phase 0.5:

- **`config/features.ts`** — fully typed flag registry resolved from env at boot
  via `!!process.env.X`: `auth.{emailPassword, magicLink, oauth.google,
oauth.github}`, `payments`, `storage`, `phoneVerification`, `admin`,
  `aiProviders[]`, `multiTenant`. Toggles use the `NEXT_PUBLIC_FEATURE_*` prefix.
- **`config/env.schema.ts`** — Zod validation that is **flag-aware**: a
  provider secret is required only when its flag is on. On a missing var it
  throws at boot with a message listing exactly which vars are missing and why.
- **`.env.example`** — every var so far, grouped by feature with comments and
  which flag requires it.
- **`docs/architecture/feature-flags.md`** — living reference table (flag → env
  var → controls → required secrets). Every future phase updates it.

Flag toggle naming (`NEXT_PUBLIC_FEATURE_*`) is recorded in
`docs/knowledge-base/decisions.md`.

---

## Phase 2 — Database Adapter Layer (this branch)

Swappable database behind one interface. App code does `import { db } from
"@/lib/db"` and never touches a provider. Adds on top of Phase 1:

- **`lib/db/adapter.ts`** — the `DatabaseAdapter` interface (user CRUD, org CRUD,
  org-membership CRUD; minimal, extended per-feature later).
- **`lib/db/schema.ts`** — canonical Zod domain models (User, Organization,
  OrganizationMember) shared by both adapters.
- **`lib/db/supabase/adapter.ts`** — Supabase implementation, RLS-aware, queries
  scoped by `organization_id`.
- **`lib/db/mongodb/adapter.ts`** — Mongoose implementation, `organization_id`
  indexed on every tenant-scoped collection.
- **`lib/db/index.ts`** — selects the adapter from `DB_PROVIDER` (the only branch
  point) and exports `db`.
- **`config/env.schema.ts`** — `DB_PROVIDER` (core) + provider-conditional
  connection vars; the `TEST_MODE` guardrail is now implemented (`TEST_DB_PATTERN`).
- **`scripts/seed.ts`** (`pnpm seed` / `npm run seed`) — provider-aware; seeds
  one org, one admin, one regular user.
- **`docker-compose.yml`** — local MongoDB (only relevant for the Mongo adapter).
- **Docs** — `docs/architecture/data-layer.md`, `docs/guides/choosing-database.md`.

Run `pnpm seed` after configuring a provider (see
`docs/guides/choosing-database.md`).

Not yet included (deferred to later phases): auth, payments, storage, phone, AI
providers, admin panel; Supabase SQL migrations / RLS policy files.

---

## Phase 3 — Auth Core (this branch)

Authentication behind one provider-agnostic interface (`@/lib/auth`). Adds on
top of Phase 2:

- **`lib/auth/`** — `AuthAdapter` interface + two backends selected by
  `DB_PROVIDER`: **Supabase Auth** (`@supabase/ssr`) or a custom **JWT + bcrypt**
  flow (MongoDB). `getSession`/`signIn`/`signUp`/`signOut`, `requireAuth()`
  server helper, and an Edge-safe session check for middleware.
- **Methods, each independently flag-gated**: email/password (with password
  reset), magic link, and Google/GitHub OAuth (only wired when a client id is
  present).
- **`components/auth/`** — `LoginForm`, `SignupForm`, `ResetPasswordForm`,
  `MagicLinkForm`, `OAuthButtons`, `LogoutButton` — render only enabled methods.
- **`middleware.ts`** — redirects unauthenticated users to `/login?next=…`.
- **Pages** — `/login`, `/signup`, `/reset-password`, protected `/dashboard`.
- **Seed** — seeded users get real credentials (`pnpm seed`, password
  `Password123!`).
- **Docs** — `docs/guides/auth-setup.md` (OAuth setup per provider).

Builds/CI without secrets: `SKIP_ENV_VALIDATION=1 npm run build`. See
`docs/guides/auth-setup.md` to enable methods.

Not yet included (deferred): roles / super-admin, admin panel, payments, storage,
phone, AI providers.
