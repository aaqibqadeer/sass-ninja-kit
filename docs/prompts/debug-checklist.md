# Prompt — Debug Checklist

A structured first pass for "something's broken in this fork." Paste with the
**symptom** filled in; work the checklist top to bottom before deeper digging.

---

```
You are debugging the ninjakit boilerplate (read
docs/knowledge-base/current-state.md first — it says which flags/providers are
actually configured in THIS fork). Symptom: [DESCRIBE WHAT'S WRONG].

Work this checklist and report findings at each step before proposing a fix:

1. Env validation. Does the app throw at boot naming a missing var? config/
   env.schema.ts requires a provider's secret only when its flag is on. Confirm
   every enabled flag's required vars are set (feature-flags.md maps them). For
   builds/CI without secrets, SKIP_ENV_VALIDATION=1 is expected.
2. Flag state. Is the feature actually ON? Flags resolve from NEXT_PUBLIC_FEATURE_*
   at BUILD time and by presence (!!): any non-empty value (even "0"/"false")
   enables it — disable by REMOVING the line. A feature that's "not showing" is
   usually a flag that's off (correct 404/null behavior), not a bug.
3. Adapter selection. DB_PROVIDER picks the DB adapter; STORAGE_PROVIDER picks
   storage. Wrong provider selected → check the value and that the chosen
   adapter folder still exists (a fork may have deleted the other, §1.5).
4. Auth/session. Protected route redirecting to /login? middleware.ts gates
   everything except its public allow-list. Public assets/pages (/, /robots.txt,
   /sitemap.xml, /api/auth/*, Stripe webhook) must be in isPublicPath.
5. Tenancy. Empty data for a logged-in user? Confirm the query is scoped to the
   ACTIVE org and the row's organization_id matches; the active org comes from the
   ninjakit_active_org cookie, re-validated server-side.
6. Payments. Stripe price won't update in place — that's intentional (§15): the
   adapter mints a NEW Price and archives the old. Webhooks bypass the login
   redirect and are signature-verified.
7. Known non-issues: `jose` emits a non-fatal Edge DecompressionStream warning
   (safe to ignore); db/auth are lazy (built on first use); env parses at import.

Only after ruling these out, dig into the specific code path. Propose the minimal
fix; don't refactor beyond the bug (§8).
```

---

Related: `docs/knowledge-base/current-state.md` (known rough edges),
`docs/architecture/feature-flags.md`.
