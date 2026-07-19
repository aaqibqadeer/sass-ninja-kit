# Decisions — Archive

> Older entries from `decisions.md`, moved here to keep the routinely-read log
> small (CLAUDE.md §11/§16). Same format, newest-first. Nothing here is
> auto-read — consult it when you need the history behind an earlier phase.

## 2026-07-19 — Phase 7: admin panel, two-tier guards, sonner toasts

The `/admin` route group is entered by an **org admin OR a super-admin** (layout
gate), then each page enforces its own tier: org-admin tabs (`users`,
`organizations`) via `requireRole('admin')`, super-admin tabs (`plans`,
`subscriptions`, `settings`) via `requireSuperAdmin()` — never collapsed (§14). The
OR-entry matters because a super-admin who isn't an org admin must still reach the
platform pages. **`trialDays` was placed under super-admin** (not org-admin as the
raw spec listed) because it's a platform-wide `app_setting` (§14) — the user
confirmed this. `/admin/users` **reuses** the existing `MemberList` + `/api/org/
members/*` routes (no parallel admin routes); it's coherent in single-tenant since
the only member is the locked self-row. Plan CRUD price changes route through
`syncStripePrices` (`lib/payments/plans.ts`) honoring **Price immutability** (new
Price + archive old), and no-op when payments is off so plan rows still save.
Refund UI pre-fills the amount from a new `payments.getLatestCharge(customerId)`
(a small Phase-5-adapter extension) and posts to `refundSubscription`, which
re-validates `amount ≤ charge total`. Per the user's §8 sign-off we added
**sonner** for toasts (mounted once in the root layout) — the one new UI feedback
pattern. New primitives (`Badge`, `Table`, `Switch`, `Toaster`) were hand-authored
to avoid extra Radix deps; `Switch` is a dependency-free `role="switch"` button,
and `ConfirmDialog` is built on the existing `Dialog` (no `alert-dialog` dep).
Shared `ConfirmDialog`/`DataTable`/`EmptyState` landed in `/components/shared`. Not
runtime-verified against live Stripe/DB (none here): typecheck + lint + prod build
pass.

## 2026-07-19 — Phase 6: storage/phone/email adapters, one email sender

Three swappable concerns landed behind the standard interface+adapter+selector
shape. **Storage** = S3 presigned URLs (`@aws-sdk/client-s3` +
`s3-request-presigner`); bytes go client→S3 directly, never through the app
server; works with S3-compatible endpoints (R2/MinIO) via optional
`AWS_S3_ENDPOINT`. AWS creds are required only when `STORAGE_PROVIDER=s3` (env
rule mirrors the DB_PROVIDER value-gated pattern). **Phone** = Twilio Verify over
plain `fetch` (Basic auth, **no SDK** — same lightweight choice as the email
sender), so Twilio owns code gen/delivery/expiry. **Email** = a single
`sendEmail()` in `lib/email/send.ts` (lifted from the old tiny `lib/auth/email.ts`,
which was **deleted** per §1.5); the 3 call sites — password reset, magic link,
org invite — now import it. Both shared components (`FileUpload`, `PhoneVerify`)
**render null when their flag is off** so they degrade gracefully wherever
dropped. `PhoneVerify` uses a plain numeric `Input` for the code rather than
adding an `input-otp` primitive/dependency this phase — kept intentionally boring;
can upgrade later. Not runtime-verified against live S3/Twilio (none here):
typecheck + lint + prod build pass.

## 2026-07-19 — Phase 5: payments data layer, org-scoped billing, nested payments flag

Billing is **organization-scoped** (user's call over user-scoped): `subscriptions`
carry `organization_id`, and `stripe_customer_id` + `trial_ends_at` live on the
`organizations` row — works identically single-/multi-tenant since every user has a
silent default org. The `payments` flag was **promoted from a bare boolean to
`{ enabled, annualBilling }`** (mirroring `auth.oauth.*`); all `features.payments`
reads became `features.payments.enabled`. `plans` and `app_settings` are the two
**platform-level (non-tenant) tables** — the deliberate §15 exception; `plans`
prices are integer **cents**. Payments follows the db pattern: `@/lib/payments`
selects one provider (Stripe today) behind a **provider-neutral `PaymentsAdapter`**;
the webhook is normalised into a small union so **no Stripe type leaks past the
seam** (the route just persists it). **Stripe Price immutability** is honored in the
adapter — a price change creates a new Price + archives the old + relinks the plan,
never a mutate. `refundSubscription(chargeId, amount?)` validates `amount ≤ charge
total` at runtime (fetches the charge) and rejects over-/non-positive refunds.
`hasAccess(session, feature)` is the **single** feature-gate — returns `true` when
payments is off, else reads the active plan's `limits` JSON, so nothing else
branches on the flag. The webhook route is **public in middleware** (signature-auth,
not cookie). Deferred to Phase 7 (per spec): all admin/super-admin billing UI —
this phase is data + adapters only. Not runtime-verified against live Stripe/DB
(none here): typecheck + lint + prod build pass, plus unit checks for the refund
guard, flag shape, and env validation.

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
codegen step is added. (Reconciled into CLAUDE.md §10 in Phase 10.)
