# CLAUDE.md — Project Rulebook

Auto-loaded every session. Follow it exactly; a user's one-off chat instruction
overrides it for that session only (don't silently rewrite this file). Deep
rationale lives in `docs/` (§17) — this file states rules, not essays.

**Project:** ninjakit — a reusable, multi-tenant, flag-driven SaaS boilerplate
**template** (infrastructure, not a product). It's forked for every new SaaS, so
decide for "the 10th fork of this repo", not today's use case.

## 1. Core Philosophy

1. **Config-driven.** Every optional feature is a flag resolved from env in
   `config/features.ts`. Never hardcode an optional feature as always-on (see §2).
2. **Adapters over conditionals.** Anything swappable (db, storage, email, ai,
   phone) has ONE interface + concrete impls; app code imports only the
   interface. Provider branching lives solely in the adapter's `index.ts`.
3. **Multi-tenant by default.** Every tenant-scoped table has `organization_id`.
   Single-tenant forks still use this schema — one silent default org per user,
   no extra UI. Never add a "single-tenant mode" that skips the org table.
4. **New table = three things, same commit:** a Zod schema, a `scripts/seed.ts`
   entry, and an adapter method. Missing any one = incomplete.
5. **Delete-what-you-don't-use.** When a fork resolves a choice (e.g. db
   provider), remove the unused adapter folder — don't leave dead code.
6. **Small, committable phases.** Finish one unit, say what changed, give the
   commit command, stop. Asked for everything at once → push back and phase it.
7. **Componentize aggressively.** Any UI pattern used more than once becomes a
   reusable component (§9) — that's what makes forking fast.

## 2. What's Core (never flag-gated)

Present in every fork (removing them breaks the template):

- Next.js App Router + TypeScript + TailwindCSS + shadcn/ui
- `config/features.ts` and `config/env.schema.ts`
- The database adapter **interface** (`lib/db/adapter.ts`) — the chosen impl is a
  one-time init decision, but the interface is core
- The organizations/multi-tenant schema; `scripts/seed.ts`
- `docs/` structure incl. the knowledge base (§11); ESLint+Prettier (§6); theme (§10)

Everything else (auth, payments, storage, phone, ai, admin, cookie banner) is
flag-gated and must degrade to "not rendered / not routable" when off — never a
broken page or thrown error.

## 3. Folder Structure Contract

```
/app          → routes only; thin. No business logic beyond calling lib/.
/components   → /ui (shadcn primitives), /shared (own reusable, §9),
                /auth /admin … (feature-grouped, reusable within the feature)
/config       → features.ts (flags), env.schema.ts (Zod env), theme.ts (tokens, §10)
/lib          → /db (adapter.ts + /supabase /mongodb), /auth /storage /email /phone /ai
                — same interface+adapter pattern
/docs         → README.md, /guides, /prompts, /architecture, /llm-context,
                /legal-templates, /knowledge-base (§11)
/scripts      → seed.ts, seed-test.ts (resets .env.test db, §12)
/types  .env.example  .env.test.example
```

**Rule:** logic goes in `/lib`, not `/app`. Route files read like a table of
contents, not an implementation.

## 4. TypeScript / JavaScript Standards

- Strict mode, no `any` (use `unknown` + narrow). `const` by default; no `var`.
- Named exports, except Next.js files that require default (pages/layouts) and
  single-component files named after the component.
- Async/await, not `.then()`. Wrap fallible awaits in try/catch at the boundary
  that produces a typed `AppError` (§8).
- No barrel files inside `/lib` adapters — import the specific module.
- Business logic in `/lib` is pure-ish: take data, return data, no Next.js
  req/res objects — keep it testable.
- **Zod at every boundary.** Every API route validates input first; every env
  access goes through `config/env.schema.ts`, never raw `process.env.X`.

## 5. React Conventions

- Functional components + hooks only; no class components.
- Server Components by default. Add `'use client'` only for real interactivity/
  browser APIs/hooks, and push the boundary as small as possible (extract the
  interactive bit rather than marking a whole page client).
- One component per file, PascalCase filename matching the component.
- Props typed with an explicit `interface ComponentNameProps` (not inline).
- No prop-drilling past 2 levels — use context/colocation; flag it, don't drill.
- Composition over configuration (children/slots, not 15 boolean props).
- No inline styles — Tailwind utilities reading theme tokens (§10); no hardcoded
  hex/px.
- Accessibility is baked in: semantic HTML, labeled fields, keyboard nav, `alt`.

## 6. Linting & Formatting

- ESLint `next/core-web-vitals` + `@typescript-eslint/recommended`, default rules
  — overrides only when a rule truly causes friction, documented with a one-liner.
- Prettier defaults own formatting; ESLint owns quality (via
  `eslint-config-prettier`). Don't hand-tune Prettier.
- `lint` + `typecheck` must pass before a phase is done.

## 7. Adding a New Feature — Standard Procedure

Every time, in order:

1. **Flag?** → `config/features.ts` + `docs/architecture/feature-flags.md`, same commit.
2. **Env vars?** → `.env.example` (grouped/commented) + `env.schema.ts` (gated on the flag).
3. **Data?** → Zod schema + adapter methods (both DB providers for tenant data) + seed entry, together.
4. **Reusable UI?** → check `docs/architecture/components.md` first; reuse/extend before writing new (§9).
5. **Build UI reading the flag** — graceful fallback when off, never a broken page.
6. **Update `docs/guides/*.md`** if setup changed.
7. **Log the decision** in `docs/knowledge-base/` (§11).
8. **Give the commit command. Stop.** No unrelated work in the same turn.

## 8. What NOT to Do

- Don't add unasked-for features "while you're in there" — note them as suggestions.
- Don't regenerate a whole file when a targeted edit works (diffs are cheaper to review).
- Don't invent env vars without adding them to `.env.example`/`.env.test.example`.
- Don't hardcode configurable values (trial lengths, plan names, colors, fonts) —
  read from `app_settings` or `config/theme.ts`.
- Don't write tenant data to `organization_id`-less tables, even temporarily.
- Don't add a second UI library / CSS approach / state pattern without an explicit
  human decision — stay intentionally boring and consistent.
- Don't bend one db provider's schema idioms to imitate the other.
- Don't build/test against production-shaped credentials (§12).

## 9. Reusable Components — Build Once, Reuse Everywhere

1. **Check `docs/architecture/components.md` first** (living catalog: name,
   purpose, props, usage). If something close exists, extend it, don't duplicate.
2. If a pattern is even plausibly reusable (form fields, empty states, tables,
   modals, confirm dialogs, uploads, avatars, badges, skeletons, pagination,
   toasts) → build it in `/components/shared`, not inline.
3. Every new shared component gets a `components.md` entry in the **same commit**
   (name, one-line purpose, props, usage) — mandatory, that's what enables reuse.
4. Feature components (`components/auth/…`) stay feature-scoped until a second
   unrelated feature needs them — then promote to `/shared` + update the catalog.

## 10. Theming — Single Source of Truth

- `config/theme.ts` holds every design token (colors, fonts, spacing, radii,
  shadows) as a typed object.
- Tokens are mirrored as CSS custom properties in `globals.css` — one set in
  `:root` (light) and one in `.dark` (dark) — so theme swaps are a variable
  change, not a component hunt.
- **Tailwind v4** (CSS-first): **no `tailwind.config.ts`**. `globals.css` exposes
  each var via `@theme inline`, so `bg-primary`/`text-muted-foreground` and raw
  `var(--primary)` stay in sync. Values are `oklch`. v4 can't import the `.ts`, so
  `globals.css` is a **hand-mirrored** copy of `theme.ts` — change both. Details:
  `docs/architecture/theming.md`.
- No component hardcodes a color/font/spacing. Missing token → add to `theme.ts`
  first, then use it (no `text-[#1a2b3c]` shortcuts).
- Dark mode is token-based (each token has light+dark), toggled by a `class` on
  `<html>`.

## 11. Knowledge Base — Agent Handoff

`docs/knowledge-base/` is the shared memory across agents/sessions — treat it as
seriously as code.

- `current-state.md` — a living **snapshot** (overwritten, not appended): phase,
  which flags/providers this fork configures, what's deferred, known rough edges.
  **The first file a new agent reads.** Keep it tight — a snapshot, not a log.
- `decisions.md` — dated, newest-first log of non-obvious decisions + why (only
  what a future agent would otherwise re-derive or get wrong). Older entries live
  in `decisions-archive.md`.
- `glossary.md` — project-specific terms.
- **Rule:** any session that makes a non-trivial decision or finishes a phase
  updates `current-state.md` before ending — tersely.

## 12. Test Environment — Safe Sandbox

- `.env.test` = credentials for an **isolated** test instance (never prod or dev),
  so agents can seed/migrate/destroy safely. Documented in `.env.test.example`.
- `TEST_MODE=true` makes `config/env.schema.ts` run a boot guard that refuses to
  start unless the resolved DB target matches an allow-listed test pattern — a
  speed bump against pointing a test run at production.
- `scripts/seed-test.ts` (`pnpm seed:test`) wipes+reseeds the test db, idempotent.
- Any agent asked to "test this" defaults to `.env.test` and states which
  environment it's using before anything destructive.

## 13. When Multiple Reasonable Approaches Exist

Ask — don't silently pick. Name each option + its one-line trade-off, wait for a
decision (even at the cost of a turn). Applies to architectural/library choices
and anything costly to reverse; not to trivia (naming, which shadcn variant).
Default to asking when unsure.

## 14. Roles & Super Admin (detail: `docs/architecture/data-layer.md`)

Two **independent** tiers that must never collapse into one check:

- **Org role** (`organization_members.role`): `admin`|`user`, extensible via
  `config/permissions.ts` (no schema change). Scoped to one org.
- **Platform `super_admin`** (`users.is_super_admin`, NOT in
  `organization_members`): manages pricing/billing across the whole deployment
  (create/edit/deactivate/reorder plans; view/cancel/refund any subscription).
  Independent of `multiTenant` — exists identically in single- and multi-tenant.
- `requireSuperAdmin()` is a **separate** guard from `requireRole('admin')` — an
  org admin is never a super admin. Never merge the two.
- Seed the first super admin from `SUPER_ADMIN_EMAIL` (never hardcoded).

## 15. Pricing Plans & Billing (detail: `data-layer.md`, `guides/payments-setup.md`)

- `plans` is the **sole platform-level table** — no `organization_id` (the
  deliberate exception to §1.3). Fields incl. `priceMonthly`, `priceAnnual?`,
  `annualDiscountPercent?`, `limits` JSON, `isActive`, `sortOrder`.
- **≥3 plans, all data.** Seed ships 3 placeholders; super admin CRUDs them.
  Never hardcode a plan count/name/price — always read the `plans` table.
- Annual cadence is flag-gated (`features.payments.annualBilling`); toggling needs
  no schema change.
- **Stripe Price immutability:** never mutate a Price. On a price change the
  adapter mints a new Price, archives the old, relinks the plan; existing
  subscribers keep their price unless explicitly migrated.
- Admin actions call `lib/payments/` methods (`cancelSubscription`,
  `refundSubscription`), never Stripe from a route. `refundSubscription(amount?)`
  — omit = full refund; provided must be validated `≤` the original charge.
- `hasAccess(user, feature)` reads the active plan's `limits` — extend it, don't
  duplicate.

## 16. Response Style & Token Discipline

- Lead with the diff/code, not a restatement of the ask. Keep prose short.
- End a phase/feature with the exact conventional-commit command (`feat:`/`fix:`/
  `chore:`/`docs:`).
- If a request breaks §1–§15, say so and propose the compliant version.
- **Token discipline** (this repo is used heavily — keep sessions cheap):
  - Read the specific doc **section** you need, not whole catalogs; prefer
    `Grep`/targeted reads over full-file reads of large files.
  - Don't re-run a full `pnpm build` when `typecheck` answers the question.
  - Keep `current-state.md`/`decisions.md` **terse** — a snapshot and short
    entries, not essays; archive old decisions (§11).

## 17. Reference Docs (read when relevant; don't restate here)

- `architecture/overview.md` (philosophy) · `feature-flags.md` · `data-layer.md`
  (adapters, schema, roles/pricing detail) · `components.md` (catalog) ·
  `theming.md`
- `knowledge-base/current-state.md` (**read first**) · `decisions.md` (+ archive)
  · `glossary.md`
- `guides/*.md` (per-feature setup) · `prompts/*.md` (CRUD feature, seed data,
  admin page, legal docs, debugging, scaffold)

If you're about to explain something a doc above covers, point to it instead.
