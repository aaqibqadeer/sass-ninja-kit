# Decisions

> Append-only log of non-obvious decisions and _why_ (CLAUDE.md §11). Short
> entries, dated, **newest at the top**. Only decisions a future agent would
> otherwise have to re-derive or might get wrong by guessing.

## 2026-07-19 — Phase 4: roles/permissions, super-admin scaffold, cookie-based active org

Authorization has **two tiers that never collapse** (§14): org roles via
`config/permissions.ts` (a role→permission map, so a fork adds a role with no
schema change — roles stay a free string) guarded by `requireRole()` /
`requirePermission()` / API `authorize()`; and a platform `users.is_super_admin`
flag guarded by a **separate** `requireSuperAdmin()`. Super-admin was scaffolded
**now** (field in both adapters + `SUPER_ADMIN_EMAIL` seed promotion) even though
the admin panel that consumes it is the next phase — the field is flag-independent
and cheap to land early, and §15 depends on it. The workspace switcher uses a
**cookie** (`ninjakit_active_org`) re-validated against memberships every request
(`resolveActiveOrgContext`), **not** subdomain/path routing — provider-agnostic and
needs no route restructure or middleware change; `Session` gained `role` +
`user.isSuperAdmin`. Email invites (`organization_invitations` table, single-use
token, 7-day expiry) **reuse the tiny `sendAuthEmail`** sender rather than
building `lib/email` this phase (Resend if configured, else console.log in dev).
Per the user's call this shipped as **one combined commit** (an explicit override
of §1.6 for this session). All multi-tenant surfaces `404`/hide when
`multiTenant` is off; the silent single-org path is unchanged. Not runtime-verified
against a live DB (none configured here) — typecheck/lint/build only.

## 2026-07-19 — Auth core: two backends behind one interface, Edge-safe middleware

Auth follows the same interface+adapter shape as the db layer: `@/lib/auth`
selects Supabase Auth (`@supabase/ssr`, session in Supabase cookies) or a custom
JWT+bcrypt flow (MongoDB; session in an httpOnly cookie) from `DB_PROVIDER`.
Because middleware runs on the Edge runtime and mongoose is Node-only, there are
**two** provider selectors: `lib/auth/index.ts` (Node, full adapter) and
`lib/auth/edge.ts` (Edge, session check only — `jose` verify for Mongo,
`@supabase/ssr` for Supabase). Reset/magic-link tokens in the Mongo flow are
**stateless** signed JWTs (no token tables); Supabase uses its own email +
PKCE-code callbacks. Auth credentials live in the auth layer (Mongo:
`auth_credentials` bcrypt hashes), not in the db `users` table, so both providers
keep `users` as clean profile data. `db`/`auth` are now **lazy** (constructed on
first use) so importing them doesn't require env — and `SKIP_ENV_VALIDATION`
lets builds/CI run without secrets while runtime stays fail-fast. Deferred:
per-request RLS-scoped Supabase clients, a typed `AppError`, subdomain/path org
routing, and a full `lib/email` adapter (Mongo auth emails use a tiny Resend
fetch for now). Known: `jose` triggers a non-fatal Edge "DecompressionStream"
build warning (its JWE path is bundled but never run for HS256).

## 2026-07-18 — DB adapter layer: shared Zod models, service-role Supabase, guardrail live

Both adapters map to one canonical set of Zod domain models in
`lib/db/schema.ts` (IDs as strings, timestamps as `Date`) so app code sees an
identical shape on Supabase or Mongo. `DB_PROVIDER` is treated as CORE and
always required (the DB isn't optional); its connection vars are validated
conditionally on the chosen provider, same pattern as feature secrets. The
Supabase adapter uses the **service-role** key server-side (so seed/trusted code
can write); per-request user-scoped clients that let RLS enforce tenancy are
deferred to the auth phase — for now tenant scoping is enforced by explicit
`organization_id` filters in every membership query. The Mongo adapter connects
lazily and indexes `organization_id` (+ a unique `(organization_id, user_id)`).
The §12 test guardrail is now **implemented**: with `TEST_MODE` on, boot fails
unless the DB target matches `TEST_DB_PATTERN` (default `/test/i`). Deferred:
Supabase SQL migrations + RLS policy files, and a typed `AppError` boundary
(§4/§8) — adapters currently throw descriptive `Error`s.

## 2026-07-18 — Feature-flag env convention: NEXT_PUBLIC toggles, presence = on

Flag **toggles** use the `NEXT_PUBLIC_FEATURE_*` prefix so `config/features.ts`
resolves to the same values on the server and in the client bundle (Next.js
inlines `NEXT_PUBLIC_*` at build time); provider **secrets** stay unprefixed and
server-only. Flags resolve via `!!process.env.X` (presence = on) per the agreed
shape — note the footgun: any non-empty value, including `"0"`/`"false"`,
enables the flag, so a flag is disabled by omitting its var, not by setting it
false. Env validation is deliberately **flag-aware**: a secret is required only
when the flag using it is on, and `config/env.schema.ts` aggregates all missing
required vars into one clear boot-time error. Trade-off: exposing which features
are on to the client is acceptable (non-sensitive; the UI reveals it anyway),
and renaming the toggle prefix later would touch every fork's `.env`.

## 2026-07-18 — Foundational architecture: flags + adapters, multi-tenant, catalog

The template is built config-driven: every optional feature is gated by a flag
resolved from env vars in `config/features.ts`, and every swappable concern
(database, storage, email, AI) sits behind a single interface with concrete
adapters, so a fork changes behavior by editing config, not by rewriting code.
It is multi-tenant by default — every tenant-scoped table carries
`organization_id` and single-tenant forks just get one silent default org —
because retrofitting tenancy later is far more expensive than carrying an
unused org row. Reusable UI is tracked in a mandatory component catalog
(`docs/architecture/components.md`) so components get reused across forks
instead of silently rebuilt. Together these keep the template cheap to fork
repeatedly, which is its entire purpose.

## 2026-07-18 — Tailwind v4 kept; CLAUDE.md §10 adapted to CSS-first theming

Phase 0 scaffolded on Tailwind **v4**, which has no `tailwind.config.ts` and is
CSS-first, whereas CLAUDE.md §10 describes the v3 model (`tailwind.config.ts` +
`hsl(var(--x))`). We kept v4 rather than downgrading, and adapted §10's intent:
`config/theme.ts` stays the typed source of truth, its values are mirrored into
`app/globals.css` as CSS custom properties, and Tailwind reads them via the
`@theme inline` block. The single-source-of-truth and "no hardcoded values"
rules are preserved; only the wiring mechanism differs from the doc. Trade-off:
`theme.ts` and `globals.css` must be kept in sync by hand until an optional
codegen step is added.
