# Prompt — Add a CRUD Feature

Adds a new tenant-scoped entity end to end, honoring the template's "new table =
Zod schema + seed entry + adapter method, same commit" rule (CLAUDE.md §1.4) and
the §7 feature procedure. Paste with the **Inputs** filled in.

---

```
You are working in the ninjakit boilerplate (read CLAUDE.md §1–§9 and
docs/architecture/data-layer.md first). Add a new CRUD feature following the
template exactly. Small, committable phase — do only this.

Inputs:
- Entity name (singular): [ENTITY]
- Fields (name: type, …): [FIELDS]
- Tenant-scoped? (almost always yes): [yes | no]
- Needs a UI list/detail page?: [yes | no] — behind which flag, if any?: [FLAG]

Do, in this order (all in ONE commit):
1. Zod schema for [ENTITY] in the schema layer (lib/db/schema.ts or types/),
   including organization_id for tenant data (§1.3). Never write tenant data to an
   org-less table.
2. Adapter methods on the DatabaseAdapter INTERFACE (lib/db/adapter.ts):
   create/get/list/update/delete as needed, scoped by organization_id. Implement
   them in BOTH provider adapters if both are present (lib/db/supabase +
   lib/db/mongodb); if a fork deleted one provider, implement only the survivor.
   Keep each adapter idiomatic to its backend (§8).
3. A seed entry in scripts/seed.ts so the entity has realistic sample rows.
4. If it needs an API: app/api/[entity]/route.ts (+ /[id]) — validate input with
   the Zod schema FIRST, call authorize() from @/lib/auth/roles, scope to the
   active org, return { ok, ... }; 404 when a gating flag is off.
5. If it needs UI: check docs/architecture/components.md and reuse
   DataTable/EmptyState/ConfirmDialog etc. before building anything new. Any new
   reusable component goes in components/shared with a catalog row (§9).
6. Update the relevant docs and append a decisions.md note if anything non-obvious
   came up. Update current-state.md.
7. Give me the commit command (conventional format). Stop.

Do not add routes, fields, or features I didn't ask for — note suggestions
instead (§8).
```

---

Related: `docs/architecture/data-layer.md`, `docs/prompts/write-seed-data.md`.
