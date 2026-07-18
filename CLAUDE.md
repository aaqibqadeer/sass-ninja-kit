# sass-ninja-kit

A reusable, multi-tenant SaaS boilerplate template — infrastructure to be
cloned/forked for many future SaaS projects, **not** a single product.

**Stack:** Next.js 15 (App Router) · TypeScript · TailwindCSS · shadcn/ui ·
deployed on Vercel.

**Core ideas (do not violate):**
- **Config-driven:** every optional feature is gated by a flag in
  `config/features.ts`, resolved from env vars. Never hardcode an optional
  feature as always-on.
- **Adapter pattern:** anything swappable (database, storage, email, AI
  providers) sits behind one interface; app code imports the interface, never a
  concrete adapter.
- **Multi-tenant by default:** every tenant-scoped table carries
  `organization_id`; single-tenant projects get one silent default org per user.
- **Table triad rule:** no new table/model without its Zod schema, a seed-data
  entry, and an adapter method — in the same commit.

See `docs/architecture/overview.md` for the flag-driven + adapter philosophy.
