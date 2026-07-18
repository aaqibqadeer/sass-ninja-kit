# sass-ninja-kit
[sass-ninja-ajlh0gg6x-aaqibqadeers-projects.vercel.app](sass-ninja-ajlh0gg6x-aaqibqadeers-projects.vercel.app)

A reusable, **multi-tenant SaaS boilerplate template** — infrastructure meant to
be cloned/forked for many future SaaS projects, not a single product.

**Stack:** Next.js 15 (App Router) · TypeScript · TailwindCSS · shadcn/ui · Vercel.

---

## Branches & phases

Development is split into phases. Each phase lives on its own branch, cut from
the previous phase's branch, so a later branch cumulatively contains all earlier
work.

| Branch | Contains |
| ------ | -------- |
| `phase-0-foundation` | Project scaffold, shadcn/ui, folder structure, docs skeleton, CI-lite scripts. |

> You are on **`phase-0-foundation`**.

---

## Phase 0 — Foundation (this branch)

What this branch sets up:

- **Next.js 15 App Router** project (TypeScript, TailwindCSS v4, ESLint).
- **shadcn/ui** configured (`components.json`, `lib/utils.ts`, theme in
  `app/globals.css`) with four base components: `button`, `card`, `input`,
  `label`. The home page (`app/page.tsx`) is a smoke test proving they render.
- **Folder structure** for the boilerplate:
  - `config/features.ts` — central feature-flag registry (empty shape; flags
    added per phase).
  - `components/ui/` — shadcn components.
  - `lib/`, `types/` — shared utilities and types.
  - `docs/` — `README.md` index plus `architecture/`, `guides/`, `prompts/`,
    `llm-context/`, `legal-templates/`.
- **Project docs:** `CLAUDE.md`, `.cursorrules`, and
  `docs/architecture/overview.md` (flag-driven + adapter philosophy).
- **CI-lite scripts:** `npm run typecheck` and `npm run lint` must both pass.

### Getting started

```bash
npm install
cp .env.example .env.local   # no vars needed yet in Phase 0
npm run dev                  # http://localhost:3000
```

### Checks

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
```

Not yet included (deferred to later phases): auth, database, payments, storage,
AI providers, admin panel.



