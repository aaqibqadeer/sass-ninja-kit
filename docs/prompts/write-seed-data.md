# Prompt — Write / Extend Seed Data

Adds or updates seed rows in `scripts/seed.ts` so a fresh database boots with
realistic, idempotent sample data. Part of the table triad (CLAUDE.md §1.4): a new
table isn't done until it has a seed entry. Paste with the **Inputs** filled in.

---

```
You are working in the ninjakit boilerplate (read scripts/seed.ts and
docs/architecture/data-layer.md first). Add/extend seed data. Small, focused
change.

Inputs:
- Entity/table to seed: [ENTITY]
- How many rows and what they represent: [ROWS]
- Relationships to honor (org, user, plan, …): [RELATIONSHIPS]

Rules:
1. Seed THROUGH the adapter methods (the same DatabaseAdapter interface the app
   uses) — do not write provider-specific queries in the seed script.
2. Make it IDEMPOTENT: running `pnpm seed` repeatedly must not duplicate rows
   (upsert or check-then-insert), matching how existing entities are seeded.
3. Respect multi-tenancy: tenant data attaches to a seeded organization_id; if
   multiTenant is off there's still one silent default org — attach to it (§1.3).
4. Never hardcode configurable values as if they were code — plan names/prices,
   trial length, etc. are DATA. Seed the 3 placeholder plans via the plans table;
   promote SUPER_ADMIN_EMAIL to super admin rather than hardcoding a user (§14).
5. Keep credentials/test values consistent with existing seed users (e.g. the
   shared dev password) so documented logins keep working.
6. State which environment you'd run against (.env.test by default for anything
   destructive, §12) before running. Give me the command. Stop.
```

---

Related: `scripts/seed.ts`, `scripts/seed-test.ts` (test DB reset — still a stub),
CLAUDE.md §12 (test sandbox).
