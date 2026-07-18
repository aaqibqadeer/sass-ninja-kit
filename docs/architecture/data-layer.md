# Data Layer

Living reference for the database adapter pattern. See CLAUDE.md §1.2, §2, §3.

## The pattern

Anything swappable (database, storage, email, phone, AI) gets **one interface**
and **one-or-more concrete implementations** behind it. Application code imports
only the interface — never a concrete adapter, and never a `if (provider === …)`
branch. That branching lives **exclusively** in the adapter's `index.ts`.

```
lib/db/
  adapter.ts        → the DatabaseAdapter interface (CORE — imported everywhere)
  index.ts          → selects the implementation from config (the ONLY branch point)
  supabase/         → Supabase implementation
  mongodb/          → MongoDB implementation
```

The same shape repeats for `lib/auth`, `lib/storage`, `lib/email`, `lib/phone`,
`lib/ai`.

## Rules (CLAUDE.md)

- **No barrel files** inside `/lib` adapters — import directly from the specific
  provider module so it's obvious which backend is in play (§4).
- **Delete-what-you-don't-use** — when a fork picks a provider at init, the
  unused adapter folder is removed from the generated project, not left dead
  (§1.5).
- **New table = three things, same commit** — a Zod schema, a `scripts/seed.ts`
  entry, and adapter methods (both providers, for tenant data) (§1.4).
- **Multi-tenant by default** — every tenant-scoped table carries
  `organization_id`; single-tenant forks get one silent default org per user
  (§1.3).
- **Native idioms** — each adapter should feel native to its backend; don't bend
  one provider's schema conventions to imitate the other (§8).

## Status

> Phase 0.5 scaffolds the folders and the `adapter.ts` placeholder only. The
> `DatabaseAdapter` interface, the provider selector in `index.ts`, the
> organizations schema, and the concrete Supabase/MongoDB implementations are
> **deferred to Phase 2**.
