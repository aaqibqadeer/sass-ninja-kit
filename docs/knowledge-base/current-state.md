# Current State

> **Read this first, every session** (CLAUDE.md §11). Living snapshot —
> overwritten, not appended. Update at the end of every phase/session.

_Last updated: 2026-07-19_

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
- **Phase 4** — Roles & multi-tenant UX: `config/permissions.ts` (role→permission
  map), `requireRole()`/`requirePermission()`/`authorize()` guards + platform
  `requireSuperAdmin()` (`lib/auth/roles.ts`); `users.is_super_admin` through both
  adapters + `SUPER_ADMIN_EMAIL` seed promotion; `organization_invitations` entity
  (schema + both adapters + seed); org creation, email invites, cookie-based
  active-org switching (`lib/org/*`), API routes under `app/api/org/*`, the
  `WorkspaceSwitcher` + `components/org/*`, `/settings/organization` +
  `/invite/[token]` pages, `docs/guides/multi-tenancy.md`. ✅ Complete.
- **Phase 5** — Payments & pricing (data layer): nested `payments.{enabled,
annualBilling}` flag; platform-level `plans` + `app_settings` tables and
  org-scoped `subscriptions` (both adapters, seed, `getOrganizationByStripe
CustomerId`); `organizations` gained `stripeCustomerId` + `trialEndsAt`;
  provider-neutral `lib/payments` Stripe adapter (checkout/portal/cancel/refund/
  createPrice/deactivatePrice/webhook) with Price-immutability + refund-amount
  validation; `hasAccess()`, `resolveTrialEndsAt()` wired into org creation;
  `app/api/payments/{checkout,portal,webhook}`; `payments-setup.md`. ✅ Complete.
- **Phase 6** — Storage/Phone/Email: `lib/storage` (S3 presigned URLs) +
  `FileUpload`; `lib/phone` (Twilio Verify over fetch) + `PhoneVerify`;
  `lib/email/send.ts` (single `sendEmail`, replaced + deleted `lib/auth/email.ts`,
  repointed reset/magic-link/invite call sites); `app/api/storage/upload-url`,
  `app/api/phone/{start,check}`; S3 env vars + rules; `storage-phone-email.md`.
  ✅ Complete.
- **Phase 7** — Admin panel: `/admin` route group (org-admin OR super-admin entry,
  per-page tier guards), Overview/Users/Organizations (org-admin) +
  Plans/Subscriptions/Settings (super-admin); plan CRUD (`PlanManager` +
  `PlanFormDialog`, price change → new Stripe Price via `syncStripePrices`);
  cross-org subscriptions with cancel + refund (`SubscriptionsTable`, `ConfirmDialog`,
  `payments.getLatestCharge`); trialDays editor. New primitives (Badge/Table/Switch/
  sonner `Toaster`) + shared `ConfirmDialog`/`DataTable`/`EmptyState`. Admin API
  routes under `app/api/admin/*`. ✅ Complete.
- **Phase 8** — AI integration: `@/lib/ai` seam — `AiAdapter` interface
  (`generate()`/`stream()`) with Anthropic (`@anthropic-ai/sdk`) + OpenAI
  (`openai`) adapters; provider-keyed selector `ai(provider?)` (the `aiProviders`
  flag is an array), default model per provider in `lib/ai/models.ts`, optional
  `AI_DEFAULT_PROVIDER` env; example smoke-test route `app/api/ai/generate`;
  `ai-providers.md` guide. ✅ Complete.
- **Phase 9** — SEO & legal: expanded Metadata API in `app/layout.tsx`
  (`metadataBase`, title template, OpenGraph/Twitter, robots); `app/sitemap.ts` +
  `app/robots.ts` (reuse `NEXT_PUBLIC_APP_URL`; both added to middleware public
  paths); flag-gated `cookieBanner` + `components/shared/CookieBanner.tsx`
  (client, first-party `ninjakit_cookie_consent` cookie); legal templates
  (`docs/legal-templates/{privacy-policy,terms-of-service,cookie-policy}.md`) with
  `[PLACEHOLDER]` fields + `docs/prompts/generate-legal-docs.md`. ✅ Complete.
- **Phase 10** — Docs & prompts finalization: reconciled CLAUDE.md §10 (Tailwind
  v4, was v3) and expanded `.cursorrules`; wrote all 6 `docs/prompts/*`
  (scaffold-new-saas, add-crud-feature, add-admin-panel-page, write-seed-data,
  debug-checklist, generate-legal-docs); full `getting-started.md` + new
  `deployment.md`; refreshed `docs/README.md` index; grew `glossary.md`; seeded
  `docs/llm-context/`. ✅ Complete.
- **Template status: v1.0.0 — feature-complete.** Remaining backlog is optional
  hardening, not blocking: Supabase SQL migration/RLS files, `seed-test.ts` body,
  theme→CSS codegen, a shared HTTP SSE helper for AI streaming.

CLAUDE.md §14 Roles & Super Admin and §15 Pricing & Billing are now fully
implemented — data layer, adapters, and the super-admin admin-panel UI (plan CRUD,
cross-org cancel/refund).

## Stack / conventions in this fork

- Next.js 15.5.x (App Router), TypeScript strict, TailwindCSS **v4** (CSS-first,
  no `tailwind.config.ts`), shadcn/ui (new-york style), Prettier + ESLint
  (`next/core-web-vitals` + `next/typescript` + `eslint-config-prettier`).
- Theme tokens: `config/theme.ts` (source of truth) mirrored into
  `app/globals.css`; dark mode is class-based.
- Zod is installed (core, for env schema + future model schemas).

## Configured flags / providers

- **Feature flags:** registry is fully typed in `config/features.ts` (auth
  {emailPassword, magicLink, oauth.google, oauth.github}, **payments {enabled,
  annualBilling}** (nested as of Phase 5), storage, phoneVerification, admin,
  aiProviders[], multiTenant). All resolve OFF by default — no
  `NEXT_PUBLIC_FEATURE_*` vars set in this fork yet.
- **Env validation:** `config/env.schema.ts` validates conditionally on flags
  AND on `DB_PROVIDER`; throws at boot naming each missing required var. Verified
  for no-env, provider-missing-secrets, provider selection, and guardrail cases.
- **Database:** both adapters implemented (`lib/db/{supabase,mongodb}/adapter.ts`)
  behind `DatabaseAdapter`; `DB_PROVIDER` picks one via `lib/db/index.ts`. No
  provider is actually configured in this fork (no DB env set). `SUPABASE_*` uses
  the service-role key; Mongo via `docker-compose.yml`.
- **Auth:** implemented behind `@/lib/auth` (Phase 3) — email/password + reset,
  magic link, Google/GitHub OAuth, all flag-gated; session + `middleware.ts`
  route protection. `Session` now also carries `role` (active-org role) and
  `user.isSuperAdmin` (Phase 4). No auth methods are enabled in this fork.
- **Roles / multi-tenancy (Phase 4):** `config/permissions.ts` +
  `lib/auth/roles.ts` guards; `multiTenant` now drives real UI (switcher, org
  creation, email invites, member management) — all `404`/hidden when off.
  Invites use `sendEmail` (Phase 6). `multiTenant` is OFF in this fork.
- **Payments (Phase 5):** implemented behind `@/lib/payments` (Stripe adapter) —
  checkout/portal/cancel/refund/createPrice/webhook, `hasAccess()`, trials. Data
  layer (`plans`, `app_settings`, `subscriptions`, org billing columns) in both DB
  adapters + seed. `payments` flag is OFF in this fork; no Stripe keys set. Admin
  UI that drives plan CRUD / cancel / refund is Phase 7.
- **Storage / phone / email (Phase 6):** implemented behind `@/lib/storage`
  (S3), `@/lib/phone` (Twilio Verify), and `@/lib/email/send.ts` (the single
  `sendEmail`). `storage` + `phoneVerification` flags are OFF in this fork (no AWS/
  Twilio creds). Email is not flag-gated — auth + invites now call `sendEmail`
  (Resend if `RESEND_API_KEY` set, else console in dev); `lib/auth/email.ts` was
  deleted. `FileUpload` / `PhoneVerify` shared components render null when off.
- **Admin panel (Phase 7):** implemented behind the `admin` flag (`/admin/*`,
  404 when off). Org-admin tabs + super-admin plan CRUD / cross-org subscriptions /
  trialDays. Uses sonner toasts (mounted in root layout). `admin` flag is OFF in
  this fork.
- **AI (Phase 8):** implemented behind `@/lib/ai` — `AiAdapter` interface with
  Anthropic + OpenAI adapters (official SDKs), provider-keyed selector, example
  `app/api/ai/generate` route (404 when off). `aiProviders` is an array flag; it's
  empty (OFF) in this fork — no provider keys set. `stream()` exists on the
  adapter but there's no shared HTTP SSE helper yet.
- **SEO / cookie banner (Phase 9):** Metadata API expanded in `app/layout.tsx`
  (not flag-gated); `app/sitemap.ts` + `app/robots.ts` render `/sitemap.xml` +
  `/robots.txt` (both allow-listed in `middleware.ts`). `cookieBanner` is a flat
  flag, OFF in this fork — `CookieBanner` renders null when off. Legal docs are
  templates under `docs/legal-templates/`, not routed pages.

## Intentionally deferred

- Supabase SQL migrations + RLS policy files (create tables/policies to match
  `lib/db/schema.ts`); per-request user-scoped Supabase clients (RLS enforcement)
  → with the auth phase. Adapter currently uses the service-role key.
- Typed `AppError` boundary (§4/§8) — adapters throw descriptive `Error`s.
- `scripts/seed-test.ts` body (reset + reseed the test DB) — still a stub;
  `pnpm seed` (plain seed) is implemented.
- `lib/email` adapter — auth + invite emails use a small inline Resend fetch for
  now (`lib/auth/email.ts`).
- Subdomain/path-based org routing — Phase 4 chose **cookie-based** active-org
  selection instead; subdomain/path routing remains deferred.
- SQL migration for the Supabase `is_super_admin` column and the
  `organization_invitations` table (documented in `data-layer.md`; no migration
  files are generated in this fork).
- AI providers, cookie banner (still unbuilt template features).
- Supabase SQL for Phase 5 tables (`plans`, `app_settings`, `subscriptions`) and
  the new `organizations.stripe_customer_id` / `trial_ends_at` columns — documented
  in `data-layer.md`, no migration files generated in this fork.
- No theme→CSS codegen script yet (globals.css is hand-mirrored from theme.ts).

## Known rough edges

- Tailwind v4 vs CLAUDE.md §10: §10 describes the v3 `tailwind.config.ts` +
  `hsl(var(--x))` model, but this fork runs Tailwind v4. Theming was adapted to
  the v4 CSS-first approach — see `decisions.md` (2026-07-18).
- `config/theme.ts` and `app/globals.css` must be kept in sync manually.
- `db`/`auth` are lazy (constructed on first use). Env is still parsed at import
  (fail-fast); use `SKIP_ENV_VALIDATION=1` for builds/CI without secrets.
- **Auth + multi-tenant flows are not runtime-verified end-to-end** here (no live
  DB/Supabase in this environment). Verified: typecheck, lint, production build,
  provider selection, env validation + guardrail, and the JWT+bcrypt primitives.
  The full HTTP signup→login→session flow, and the Phase 4 seed→invite→accept→
  switch flow, should be smoke-tested against a real (test) DB on a fork.
- `jose` emits a non-fatal Edge build warning (`DecompressionStream`); its JWE
  path is bundled but never executed for HS256 — safe to ignore.
