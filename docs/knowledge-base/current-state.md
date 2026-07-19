# Current State

> **Read this first, every session** (CLAUDE.md §11). Living snapshot —
> overwritten, not appended. Update at the end of every phase/session.

_Last updated: 2026-07-18_

## Phase

- **Phase 0** — Next.js 15 (App Router) + TypeScript + TailwindCSS v4 + ESLint +
  base shadcn/ui (button, card, input, label). ✅ Complete.
- **Phase 0.5** — Foundations: linting + Prettier, theme skeleton, component
  catalog, knowledge base, test-env guardrail scaffold. ✅ Complete.
- **Phase 1** — Config & feature flags: typed `config/features.ts`, flag-aware
  `config/env.schema.ts`, `.env.example`, `feature-flags.md`. ✅ Complete.
- **Phase 2** — Database adapter layer: `DatabaseAdapter` interface, Supabase +
  MongoDB adapters, `lib/db/index.ts` selector, multi-tenant schema (users,
  organizations, organization_members), `scripts/seed.ts`, docker-compose,
  data-layer + choosing-database docs. Test guardrail now implemented. ✅ Complete.
- **Phase 3** — Auth core: `@/lib/auth` interface + Supabase Auth / custom
  JWT+bcrypt adapters, email-password (+ reset), magic link, Google/GitHub OAuth
  (all flag-gated), `components/auth/*` UI, `middleware.ts`, login/signup/
  reset/dashboard pages, seed credentials, auth-setup docs. ✅ Complete.
- **Next:** roles / super-admin (CLAUDE.md §14) and the admin panel.

CLAUDE.md now has §14 Roles & Super Admin and §15 Pricing & Billing (former
Response Style / Reference Docs renumbered to §16/§17). Neither is built yet.

## Stack / conventions in this fork

- Next.js 15.5.x (App Router), TypeScript strict, TailwindCSS **v4** (CSS-first,
  no `tailwind.config.ts`), shadcn/ui (new-york style), Prettier + ESLint
  (`next/core-web-vitals` + `next/typescript` + `eslint-config-prettier`).
- Theme tokens: `config/theme.ts` (source of truth) mirrored into
  `app/globals.css`; dark mode is class-based.
- Zod is installed (core, for env schema + future model schemas).

## Configured flags / providers

- **Feature flags:** registry is fully typed in `config/features.ts` (auth
  {emailPassword, magicLink, oauth.google, oauth.github}, payments, storage,
  phoneVerification, admin, aiProviders[], multiTenant). All resolve OFF by
  default — no `NEXT_PUBLIC_FEATURE_*` vars set in this fork yet.
- **Env validation:** `config/env.schema.ts` validates conditionally on flags
  AND on `DB_PROVIDER`; throws at boot naming each missing required var. Verified
  for no-env, provider-missing-secrets, provider selection, and guardrail cases.
- **Database:** both adapters implemented (`lib/db/{supabase,mongodb}/adapter.ts`)
  behind `DatabaseAdapter`; `DB_PROVIDER` picks one via `lib/db/index.ts`. No
  provider is actually configured in this fork (no DB env set). `SUPABASE_*` uses
  the service-role key; Mongo via `docker-compose.yml`.
- **Auth:** implemented behind `@/lib/auth` (Phase 3) — email/password + reset,
  magic link, Google/GitHub OAuth, all flag-gated; session + `middleware.ts`
  route protection. No auth methods are enabled in this fork (no flags set).
- **Storage / email / phone / AI / payments:** flags exist but no logic; folders
  scaffolded as empty placeholders. (Mongo auth emails use a tiny inline Resend
  fetch, not the future `lib/email` adapter.)

## Intentionally deferred

- Supabase SQL migrations + RLS policy files (create tables/policies to match
  `lib/db/schema.ts`); per-request user-scoped Supabase clients (RLS enforcement)
  → with the auth phase. Adapter currently uses the service-role key.
- Typed `AppError` boundary (§4/§8) — adapters throw descriptive `Error`s.
- `scripts/seed-test.ts` body (reset + reseed the test DB) — still a stub;
  `pnpm seed` (plain seed) is implemented.
- `lib/email` adapter — Mongo auth emails use a small inline Resend fetch for now.
- Subdomain/path-based org routing in middleware (part of multiTenant UI).
- Roles/super-admin (§14), pricing/billing (§15), admin panel, payments,
  storage, phone, AI, cookie banner.
- No theme→CSS codegen script yet (globals.css is hand-mirrored from theme.ts).

## Known rough edges

- Tailwind v4 vs CLAUDE.md §10: §10 describes the v3 `tailwind.config.ts` +
  `hsl(var(--x))` model, but this fork runs Tailwind v4. Theming was adapted to
  the v4 CSS-first approach — see `decisions.md` (2026-07-18).
- `config/theme.ts` and `app/globals.css` must be kept in sync manually.
- `db`/`auth` are lazy (constructed on first use). Env is still parsed at import
  (fail-fast); use `SKIP_ENV_VALIDATION=1` for builds/CI without secrets.
- **Auth is not runtime-verified end-to-end** here (no live DB/Supabase in this
  environment). Verified: typecheck, lint, production build, provider selection,
  env validation + guardrail, and the JWT+bcrypt primitives. The full HTTP
  signup→login→session flow against a real DB should be smoke-tested on a fork.
- `jose` emits a non-fatal Edge build warning (`DecompressionStream`); its JWE
  path is bundled but never executed for HS256 — safe to ignore.
