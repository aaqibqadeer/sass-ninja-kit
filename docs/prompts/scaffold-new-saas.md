# Prompt — Scaffold a New SaaS from the Template

The master prompt for starting a brand-new product from ninjakit. Fork/clone the
repo first, then paste this into your coding agent with the **Inputs** filled in.
It configures the fork (DB provider, flags, env) and gets you to a first run — it
does **not** build product features (use `add-crud-feature.md` for those).

---

```
You are working in the ninjakit SaaS boilerplate (read CLAUDE.md and
docs/knowledge-base/current-state.md first). Set up this fork for a new product.
Do NOT invent features beyond what I list — follow the template's rules exactly.

Inputs:
- Product name: [PRODUCT_NAME]
- Database provider: [supabase | mongodb]
- Multi-tenant (multiple orgs per user)?: [yes | no]
- Auth methods to enable: [email-password, magic-link, google, github]
- Payments (Stripe)?: [yes | no] — annual billing too?: [yes | no]
- Storage (S3)?: [yes | no]
- Phone verification (Twilio)?: [yes | no]
- Admin panel?: [yes | no]
- AI providers: [none | anthropic, openai]
- Cookie banner?: [yes | no]

Steps:
1. In config/features.ts confirm the flags I want map to NEXT_PUBLIC_FEATURE_*
   vars. Do not change resolution logic — flags come from env.
2. Copy .env.example → .env.local and set: DB_PROVIDER, the chosen provider's
   connection vars, NEXT_PUBLIC_APP_URL, the NEXT_PUBLIC_FEATURE_* toggles for
   each feature above, and the secrets each enabled flag requires (see
   config/env.schema.ts / docs/architecture/feature-flags.md). List exactly which
   vars I still need to obtain and where to get each.
3. Per CLAUDE.md §1.5, delete the UNUSED database adapter folder under lib/db/
   (keep only the chosen provider) and note it.
4. Set SUPER_ADMIN_EMAIL to my admin email so scripts/seed.ts promotes it.
5. Run: install deps, `pnpm typecheck`, `pnpm build`. Then `pnpm seed` against a
   real/test DB. Report results.
6. Update docs/knowledge-base/current-state.md to reflect this fork's actual
   provider + enabled flags. Do not commit secrets.

Stop after the app builds and you've listed any env vars I still owe you. Give me
the exact commands to run dev and seed.
```

---

Related: `docs/guides/getting-started.md` (manual walkthrough),
`docs/guides/choosing-database.md`, `docs/guides/deployment.md`.
