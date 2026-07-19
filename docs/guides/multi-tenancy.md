# Multi-Tenancy & Roles

How organizations, roles, and the platform super-admin work in ninjakit, and how
to toggle between single- and multi-tenant modes at init.

The database is **always multi-tenant** (CLAUDE.md §1.3): every tenant-scoped
table carries `organization_id`, and every user belongs to at least one org. The
`multiTenant` flag only controls the **UI/behavior** on top of that schema — it
never changes the schema. This means you can flip a fork from single- to
multi-tenant later without a migration.

## The two modes

### Single-tenant (flag off — the default)

```env
# NEXT_PUBLIC_FEATURE_MULTI_TENANT is unset
```

- On first sign-in (any method), the user silently gets one default org
  (`{handle}'s Organization`, slug `org-<userId>`) and is made its `admin` —
  see `ensureDefaultOrganization` in `lib/auth/org.ts`.
- No org UI renders: no workspace switcher, and `/settings/organization` +
  `/invite/*` + `/api/org/*` all return `404`.
- Everything else (auth, dashboard) works exactly as before.

### Multi-tenant (flag on)

```env
NEXT_PUBLIC_FEATURE_MULTI_TENANT=1
```

Unlocks:

- **Workspace switcher** (`components/shared/WorkspaceSwitcher.tsx`) on the
  dashboard — switch active org or create a new one.
- **Org creation** — `POST /api/org` (`lib/org/organizations.ts`).
- **Email invites** — admins invite by email from `/settings/organization`;
  invitees accept at `/invite/<token>`.
- **Member management** — role changes and removal at `/settings/organization`
  (admin-only).

> The active org is tracked in a cookie (`ninjakit_active_org`) and **re-validated
> against the user's memberships on every request** (`resolveActiveOrgContext` in
> `lib/auth/org.ts`); an unknown/stale cookie silently falls back to the default
> org. There is no subdomain/path-based org routing — that remains deferred.

## Roles & permissions

Org roles are stored as an **extensible free string** on `organization_members`
(`ORG_ROLES = { admin, user }` are the built-ins). What each role may do lives in
`config/permissions.ts` — a role→permission map:

```ts
PERMISSIONS = {
  admin: [
    "org:read",
    "org:manage",
    "members:read",
    "members:invite",
    "members:remove",
    "members:updateRole",
  ],
  user: ["org:read", "members:read"],
};
```

To add a role (e.g. `billing`), add one entry here — **no schema change**. Guard
routes and pages with the helpers in `lib/auth/roles.ts`:

- `requireRole("admin")` / `requirePermission("members:invite")` — page/Server
  Component guards (404 on failure).
- `authorize({ permission: "members:invite" })` — API guard; throws
  `AuthorizationError` that `authErrorResponse()` turns into a 401/403 JSON body.

## Platform super-admin (§14)

Super-admin is a **separate tier** from org roles — a flag on the user record
(`users.is_super_admin`), independent of any org membership and of `multiTenant`.
It's the gateway to the later admin panel / pricing (§15).

```env
SUPER_ADMIN_EMAIL=you@example.com   # optional; promoted at seed time
```

- Guarded by `requireSuperAdmin()`, which is deliberately **never** collapsed
  into `requireRole("admin")` — an org admin is not a super-admin.
- Seeded by promoting `SUPER_ADMIN_EMAIL` (falls back to the seeded admin when
  unset). Never hardcoded in app code.
- For Supabase, add the column once:
  `alter table users add column is_super_admin boolean not null default false;`

## Invitations

- Created `pending` with a random `token` and a 7-day expiry
  (`lib/org/invitations.ts`), then emailed via the existing `sendAuthEmail`
  sender — **Resend if `RESEND_API_KEY` is set, otherwise the link is logged to
  the server console** (handy in local dev). A full `lib/email` adapter is a
  later phase.
- Accepting validates the token is pending, unexpired, and addressed to the
  signed-in user's email, then adds the membership and marks the invite
  `accepted`. Tokens are single-use.
- Duplicate pending invites and inviting an existing member are rejected.

> Invitees must be signed in to accept. Middleware sends an unauthenticated
> invitee to `/login?next=/invite/<token>` first, so they land back on the accept
> page after signing up or in.

## Toggling modes at init

1. Set (or unset) `NEXT_PUBLIC_FEATURE_MULTI_TENANT` in `.env.local`.
2. No migration or data change is needed — the schema is identical in both modes.
3. Restart the dev server (flags resolve at boot).

## Local testing

With a database configured (see `docs/guides/choosing-database.md`) and a test
DB, seed baseline data:

```bash
pnpm seed
```

This creates `admin@example.com` (org `admin` + promoted super-admin by default)
and `user@example.com` (org `user`), one `Test Organization`, and one pending
invitation (`invitee@example.com`). Password for both users: `Password123!`.

Then, with `NEXT_PUBLIC_FEATURE_MULTI_TENANT=1` and an auth method enabled, sign
in as the admin to see the workspace switcher and `/settings/organization`; sign
in as the regular user to confirm those admin surfaces 404 for non-admins.
