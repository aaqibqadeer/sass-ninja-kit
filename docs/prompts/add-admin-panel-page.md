# Prompt — Add an Admin Panel Page

Adds a new page/tab under the `/admin` route group with the correct tier guard
(org-admin vs platform super-admin — the two never collapse, CLAUDE.md §14).
Paste with the **Inputs** filled in.

---

```
You are working in the ninjakit boilerplate (read CLAUDE.md §14–§15 and
docs/architecture/feature-flags.md; look at existing app/admin/* pages and
components/admin/* for the pattern). Add one admin page. Small, committable phase.

Inputs:
- Page name / route segment: [NAME] → /admin/[SEGMENT]
- Tier: [org-admin | super-admin]
- What it shows/does: [DESCRIPTION]
- Reads/writes which data (adapter methods): [DATA]

Do (ONE commit):
1. The whole panel is gated by the `admin` flag (404 when off) — don't change
   that. Add app/admin/[SEGMENT]/page.tsx as a Server Component.
2. Guard it by tier: org-admin pages call requireRole('admin'); super-admin pages
   call requireSuperAdmin(). Never let an org admin reach a super-admin page and
   never merge the two checks. If the data is a platform concern (plans, billing,
   cross-org), it's super-admin.
3. Add the tab to components/admin/AdminNav.tsx, shown only for the right tier
   (and gated on payments/multiTenant flags if relevant, like the existing tabs).
4. Business logic goes through lib/ adapters (e.g. lib/payments/*), never a raw
   SDK call in the route/page. If you need a mutation, add an API route under
   app/api/admin/* that re-checks the tier with authorize({ superAdmin: true }) or
   authorize({ role: 'admin' }).
5. Reuse DataTable / ConfirmDialog / EmptyState from components/shared; any new
   shared component gets a components.md catalog row (§9).
6. Update docs + current-state.md. Give me the commit command. Stop.
```

---

Related: `docs/architecture/feature-flags.md` (admin tier notes),
CLAUDE.md §14 (roles) and §15 (pricing/billing).
