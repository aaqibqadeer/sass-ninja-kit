# Current State

> **Read this first, every session** (CLAUDE.md §11). Living **snapshot** —
> overwritten, not appended. Keep it terse. Update at the end of every phase.

_Last updated: 2026-07-20 — **Template v1.0.0, feature-complete.**_

## Marketing + app shell (post-v1.0.0)

- **Public landing page** (`app/page.tsx`) replaces the Phase-0 smoke card:
  static + auth-free (renders on any fork, SEO-friendly). Sections are
  feature-scoped `components/marketing/` (`Hero`, `FeatureShowcase`,
  `CtaSection`); header/footer are shared (`SiteHeader`, `SiteFooter`,
  `BrandMark`). Primary CTA → `/login`.
- **Signed-in nav** (`components/shared/AppHeader` + client `AppNav`): global bar
  reused by `/dashboard`, `/settings/organization`, and the `/admin` layout.
  Derives links from flags + role (Dashboard always; Organization when
  `multiTenant` && org-admin; Admin when `features.admin` && admin/super-admin),
  and mounts `WorkspaceSwitcher` + `LogoutButton`. Dashboard slimmed to a
  welcome + account card (nav/switcher/sign-out moved into the header).
- Verified: typecheck; landing renders light+dark (headless); `/login` 200,
  `/dashboard`→307 `/login`. Signed-in pages still need a live DB to render.

## Phases (all ✅ complete)

| #   | Area                    | Landed                                                                                          |
| --- | ----------------------- | ----------------------------------------------------------------------------------------------- |
| 0   | Foundation              | Next.js 15 App Router, TS, Tailwind **v4**, ESLint, base shadcn/ui                              |
| 0.5 | Foundations             | lint+Prettier, theme skeleton, component catalog, KB, test-env guardrail scaffold               |
| 1   | Config & flags          | typed `config/features.ts`, flag-aware `env.schema.ts`, `.env.example`                          |
| 2   | DB adapter layer        | `DatabaseAdapter` + Supabase/MongoDB impls, selector, multi-tenant schema, `seed.ts`            |
| 3   | Auth core               | `@/lib/auth` (Supabase Auth / JWT+bcrypt), email+reset/magic-link/OAuth, middleware, auth UI    |
| 4   | Roles & multi-tenant UX | `config/permissions.ts`, role guards + `requireSuperAdmin()`, invites, cookie active-org, orgs  |
| 5   | Payments (data layer)   | `@/lib/payments` Stripe adapter, `plans`/`app_settings`/`subscriptions`, `hasAccess()`, trials  |
| 6   | Storage/Phone/Email     | `@/lib/storage` (S3), `@/lib/phone` (Twilio), `@/lib/email/send.ts` (`sendEmail`)               |
| 7   | Admin panel             | `/admin` (tiered guards), plan CRUD, cross-org subs cancel/refund, sonner toasts                |
| 8   | AI integration          | `@/lib/ai` (`AiAdapter` gen/stream), Anthropic+OpenAI SDKs, `ai(provider?)`, `/api/ai/generate` |
| 9   | SEO & legal             | Metadata API, `sitemap.ts`/`robots.ts`, flag-gated `CookieBanner`, legal templates + prompt     |
| 10  | Docs finalization       | prompts, getting-started/deployment guides, README index, CLAUDE.md/.cursorrules reconcile      |

CLAUDE.md §14 (roles) and §15 (pricing) are fully implemented (data layer +
adapters + super-admin admin UI).

## Stack

Next.js 15.5.x (App Router) · TS strict · Tailwind **v4** (CSS-first, no
`tailwind.config.ts`) · shadcn/ui (new-york) · Prettier + ESLint · Zod. Theme:
`config/theme.ts` mirrored into `app/globals.css`, dark mode class-based.

## Configured in THIS fork

**Every feature flag is OFF** — no `NEXT_PUBLIC_FEATURE_*` and no provider
secrets are set here. All features are implemented behind their lib seam and
degrade to 404/null when off. No DB provider is configured (no DB env).

| Seam                         | State                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| flags (`config/features.ts`) | full typed registry; `payments` is nested `{enabled,annualBilling}`; `aiProviders` is an array |
| env (`env.schema.ts`)        | validates conditionally on flags + `DB_PROVIDER`; throws at boot naming missing vars           |
| `@/lib/db`                   | both Supabase + MongoDB adapters exist; `DB_PROVIDER` selects; none configured                 |
| `@/lib/auth`                 | all methods implemented, flag-gated; `Session` carries `role` + `user.isSuperAdmin`            |
| `@/lib/payments`             | Stripe adapter (checkout/portal/cancel/refund/createPrice/webhook); no keys set                |
| `@/lib/storage` `/phone`     | S3 + Twilio Verify; components render null when off                                            |
| `@/lib/email/send.ts`        | single `sendEmail` (not flag-gated) — Resend if `RESEND_API_KEY`, else console                 |
| `@/lib/ai`                   | Anthropic+OpenAI behind `ai(provider?)`; array flag empty here                                 |
| admin / SEO / cookie banner  | `/admin` 404 when off; Metadata+sitemap+robots always on; `cookieBanner` flag off              |

## Intentionally deferred

- Supabase SQL migration/RLS files (create tables/policies matching
  `lib/db/schema.ts`, incl. `is_super_admin`, invitations, Phase-5 tables + the
  `organizations.stripe_customer_id`/`trial_ends_at` columns) — none generated here.
- Per-request user-scoped (RLS-enforcing) Supabase clients — adapter uses the
  service-role key.
- `scripts/seed-test.ts` body (still a stub; `pnpm seed` works).
- Typed `AppError` boundary (§4/§8) — adapters throw descriptive `Error`s.
- Subdomain/path org routing (Phase 4 chose cookie-based active-org).
- theme→CSS codegen; a shared HTTP SSE helper for AI streaming.

## Known rough edges

- `config/theme.ts` ↔ `app/globals.css` kept in sync **manually**.
- `db`/`auth` are lazy; env parses at import (fail-fast) — use
  `SKIP_ENV_VALIDATION=1` for builds/CI without secrets.
- **Not runtime-verified against a live DB here** (none in this env). Verified:
  typecheck, prod build, provider selection, env/guardrail, JWT+bcrypt, and (Phase 9) sitemap/robots + cookie banner via a headless browser. The full signup→login
  and seed→invite→accept flows should be smoke-tested on a fork with a test DB.
- **`pnpm lint` is broken in this environment:** `@rushstack/eslint-patch` fails
  to patch ESLint 9.39.5 at config-load (also breaks `next build`'s lint step). A
  toolchain version-resolution issue, not app code — pin ESLint/patch to fix.
- `jose` emits a non-fatal Edge `DecompressionStream` warning — safe to ignore.
