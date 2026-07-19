# Data Layer

Living reference for the database adapter pattern. See CLAUDE.md §1.2, §2, §3.

## The pattern

The database is swappable, so it follows the interface+adapter rule: **one
interface**, one-or-more concrete implementations, and a single selector.
Application code imports only `db` from `@/lib/db` — never a concrete adapter,
never `DB_PROVIDER`, never a `if (provider === …)` branch.

```
lib/db/
  schema.ts         → canonical Zod domain models (User, Organization, OrganizationMember)
  adapter.ts        → the DatabaseAdapter interface (CORE — imported everywhere)
  index.ts          → selects the implementation from env.DB_PROVIDER (the ONLY branch point)
  supabase/
    adapter.ts      → Supabase implementation (RLS-aware, scoped by organization_id)
  mongodb/
    adapter.ts      → MongoDB/Mongoose implementation (organization_id indexed)
```

`schema.ts` is the single source of truth for entity shapes; both adapters map
their storage rows/documents to and from these types, so app code sees one shape
regardless of provider. IDs are strings; timestamps are `Date`.

## The interface (Phase 2)

`DatabaseAdapter` is intentionally minimal — user CRUD, organization CRUD, and
org-membership CRUD. Membership methods take `organizationId` first, so every
tenant-scoped operation is explicitly org-bound (§1.3). Later phases extend the
interface per-feature; each new table adds its methods here alongside a Zod
schema and a seed entry, in the same commit (§1.4).

## Multi-tenant schema

| Entity             | Table / collection         | Tenant-scoped?                  | Notes                                                                                                      |
| ------------------ | -------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| User               | `users`                    | No (global identity)            | `id`, `email` (unique), `name?`, **`is_super_admin`** (platform-level, §14), timestamps                    |
| Organization       | `organizations`            | Is the tenant boundary          | `id`, `name`, `slug` (unique), timestamps                                                                  |
| OrganizationMember | `organization_members`     | Yes — carries `organization_id` | `organization_id` + `user_id` (unique together, both indexed), `role`                                      |
| Invitation         | `organization_invitations` | Yes — carries `organization_id` | `email`, `role`, `token` (unique), `status` (pending/accepted/revoked), `invited_by_user_id`, `expires_at` |

`role` is an extensible free string; `admin` and `user` are the built-ins
(`ORG_ROLES` in `lib/db/schema.ts`). What each role may do is defined in
`config/permissions.ts` (Phase 4) — add a role there, no schema change.

**`users.is_super_admin`** (Phase 4, §14) is a **platform-level** flag on the
user record itself — deliberately NOT in `organization_members`, because
pricing/billing are platform concerns independent of any org membership. It's
independent of the `multiTenant` flag and exists identically in single- and
multi-tenant deployments. Guarded by `requireSuperAdmin()`, which is kept
separate from `requireRole("admin")` (an org admin is never a super-admin). For
Supabase, add the column: `alter table users add column is_super_admin boolean
not null default false;`. Seed promotes `SUPER_ADMIN_EMAIL` (never hardcoded).

## Provider selection

`lib/db/index.ts` reads `env.DB_PROVIDER` (`supabase` | `mongodb`) and
instantiates the matching adapter once. Only the selected provider's connection
vars must be present — `config/env.schema.ts` validates them conditionally and
throws at boot naming any that are missing.

## Rules (CLAUDE.md)

- **No barrel files** inside the adapter subfolders (`supabase/`, `mongodb/`) —
  import directly from the specific module (§4).
- **Delete-what-you-don't-use** — when a fork picks a provider at init, remove
  the unused adapter folder and its `case` in `index.ts` (§1.5).
- **New table = three things, same commit** — Zod schema, `scripts/seed.ts`
  entry, adapter method(s) on both providers for tenant data (§1.4).
- **Native idioms** — each adapter feels native to its backend; don't bend one
  provider's conventions to imitate the other (§8).

## How to add a new database adapter (e.g. Prisma, DynamoDB)

1. Add the provider name to the `DB_PROVIDER` enum in `config/env.schema.ts` and
   add its connection vars (optional in the object; required via a rule in
   `requirementRules` when that provider is chosen).
2. Create `lib/db/<provider>/adapter.ts` exporting a class that
   `implements DatabaseAdapter`. Map the provider's rows/documents to and from
   the canonical types in `lib/db/schema.ts`. Keep every tenant-scoped query
   filtered by `organization_id`.
3. Add a `case` to the `switch` in `lib/db/index.ts`.
4. Document setup (env vars, local dev) in `docs/guides/choosing-database.md`.
5. No app code changes — that's the point.

## Status

Implemented in Phase 2: interface, Supabase + MongoDB adapters, selector, the
three-entity multi-tenant schema, and `scripts/seed.ts`. The Supabase adapter
uses the service-role key server-side; per-request user-scoped (RLS-enforcing)
clients arrive with auth in a later phase. SQL migrations / RLS policy files for
Supabase are **deferred** — see `docs/guides/choosing-database.md`.

Extended in Phase 3 (auth): `NewUser` gained an optional `id` (so the Supabase
auth uid can be the profile row id), and `listMembershipsForUser(userId)` was
added to resolve a user's org context. `db` is now created lazily on first use
(importing `@/lib/db` no longer requires a configured connection — useful for
builds). Auth credentials live in the auth layer, not the db layer: the MongoDB
flow stores bcrypt hashes in an `auth_credentials` collection; Supabase uses its
own `auth.users`.
