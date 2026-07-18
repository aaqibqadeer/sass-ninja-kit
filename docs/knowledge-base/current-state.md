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
- **Next:** Phase 2 (database adapter + organizations schema).

No product features are built yet — Phase 1 is config/flag skeleton only, no
auth/db/payment logic.

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
- **Env validation:** `config/env.schema.ts` validates conditionally on flags;
  throws at boot listing missing required secrets. Verified for all-off,
  flag-on-missing, and flag-on-supplied cases.
- **Database provider:** not chosen yet (Phase 2). Adapter folders scaffolded
  (`lib/db/{supabase,mongodb}`) but empty.
- **Auth / storage / email / phone / AI / payments:** flags exist but no logic;
  folders scaffolded as empty placeholders.

## Intentionally deferred

- DB adapter interface + implementations, organizations/multi-tenant schema,
  `seed.ts`/`seed-test.ts` bodies → **Phase 2**.
- The test-env guardrail (`assertTestEnvironmentSafety`) is a **passing
  placeholder** — real per-provider test-pattern validation lands in Phase 2.
- No theme→CSS codegen script yet (globals.css is hand-mirrored from theme.ts).
- No auth/payments/storage/phone/AI features, no admin panel, no cookie banner.

## Known rough edges

- Tailwind v4 vs CLAUDE.md §10: §10 describes the v3 `tailwind.config.ts` +
  `hsl(var(--x))` model, but this fork runs Tailwind v4. Theming was adapted to
  the v4 CSS-first approach — see `decisions.md` (2026-07-18).
- `config/theme.ts` and `app/globals.css` must be kept in sync manually.
