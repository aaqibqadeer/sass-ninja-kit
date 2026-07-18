# sass-ninja-kit

A reusable, **multi-tenant SaaS boilerplate template** — infrastructure meant to
be cloned/forked for many future SaaS projects, not a single product.

**Stack:** Next.js 15 (App Router) · TypeScript · TailwindCSS · shadcn/ui · Vercel.

---

## Branches & phases

Development is split into phases. Each phase lives on its own branch, cut from
the previous phase's branch, so a later branch cumulatively contains all earlier
work.

| Branch                  | Contains                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `phase-0-foundation`    | Project scaffold, shadcn/ui, folder structure, docs skeleton, CI-lite scripts.                                                        |
| `phase-0.5-foundations` | Everything above **+** linting/Prettier, theme skeleton, component catalog, knowledge base, test-env guardrail, full folder contract. |

> You are on **`phase-0.5-foundations`**.

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
npm run typecheck    # tsc --noEmit
npm run lint         # eslint .
npm run format       # prettier --write .
```

---

## Phase 0.5 — Foundations (this branch)

Conventions, tooling, and living docs that every future phase must follow. No
features. Adds on top of Phase 0:

- **Linting & formatting** — ESLint (`next/core-web-vitals` + `next/typescript`)
  - Prettier + `eslint-config-prettier`; `format`/`format:check` scripts.
- **Folder contract** — full skeleton per `CLAUDE.md` §3:
  `components/shared`, `lib/{db,auth,storage,email,phone,ai}` (with
  `lib/db/{supabase,mongodb}` and `lib/db/adapter.ts` stub), `scripts/`
  (`seed.ts`, `seed-test.ts` stubs), `docs/knowledge-base/`.
- **Theme system** — `config/theme.ts` (typed token source of truth) mirrored
  into `app/globals.css`; class-based dark mode; `docs/architecture/theming.md`.
- **Component catalog** — `docs/architecture/components.md` (button, card,
  input, label tracked from day one).
- **Knowledge base** — `docs/knowledge-base/{current-state,decisions,glossary}.md`.
- **Test-env guardrail** — `.env.test.example`, `config/env.schema.ts`
  (`TEST_MODE` + `assertTestEnvironmentSafety()` scaffold),
  `docs/guides/getting-started.md`.
- **Governing rulebook** — full `CLAUDE.md` project rulebook at repo root.

The theme was adapted to Tailwind v4 (CSS-first, no `tailwind.config.ts`) — see
`docs/knowledge-base/decisions.md`.

Not yet included (deferred to later phases): auth, database adapters, payments,
storage, phone, AI providers, admin panel.
