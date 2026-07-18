# CLAUDE.md — Project Rulebook

This file is read automatically by Claude Code at the start of every session in
this repo. Its job is to make Claude behave like a disciplined senior engineer
on THIS specific codebase, not a generic assistant. Follow it exactly. If
something here conflicts with a one-off instruction from the user in chat, the
user's latest instruction wins for that session only — don't silently rewrite
this file based on a single conversation.

**Project:** ninjakit — a reusable, multi-tenant, flag-driven SaaS boilerplate
template. **Purpose:** This is infrastructure, not a product. It gets
forked/cloned for every new SaaS built on top of it. Every decision should be
made with "will this still make sense on the 10th fork of this repo" in mind,
not "does this work for today's use case."

## 1. Core Philosophy (read this twice)

1. **Config-driven, not code-driven.** Every optional feature (auth methods,
   payments, storage, phone verification, AI providers, admin panel,
   multi-tenancy) is controlled by a flag resolved from environment variables in
   `config/features.ts`. Never hardcode a feature as always-on unless it's
   explicitly listed as core (see §2).
2. **Adapters over conditionals.** Anything swappable (database, storage, email,
   AI providers) gets ONE interface and one-or-more concrete implementations
   behind it. Application code imports only the interface. It never contains
   `if (dbProvider === 'mongodb')` — that branching lives exclusively inside
   `lib/db/index.ts`, nowhere else.
3. **Multi-tenant by default.** Every tenant-scoped table has `organization_id`.
   Single-tenant projects still use this schema — they just get one silent
   default org per user with no extra UI. Never create a "single-tenant mode"
   that skips the org table; that's the retrofit trap.
4. **New table = three things, same commit.** Any new model/table must ship
   with: a Zod schema, a seed-data entry in `scripts/seed.ts`, and an adapter
   method. A table without all three is an incomplete change — don't submit it
   as done.
5. **Delete-what-you-don't-use, not comment-out.** When a setup script resolves
   a choice (e.g. database provider), remove the unused adapter folder from the
   generated project rather than leaving both in with one dead. Dead code in a
   boilerplate compounds across every fork.
6. **Small, committable phases.** Don't build five features in one response.
   Finish one coherent unit, say what changed, give the commit command, stop. If
   asked to do everything at once, push back and suggest phasing it — this is a
   standing instruction, not something to relitigate each time.
7. **Componentize aggressively.** Any UI pattern used (or likely to be used)
   more than once becomes a small, reusable component — see §9. This is not
   optional polish; it's the mechanism that makes forking this repo fast instead
   of slow.

## 2. What's Core (never flag-gated)

These exist in every fork regardless of config, because removing them breaks the
template itself:

- Next.js App Router + TypeScript + TailwindCSS + shadcn/ui
- `config/features.ts` and `config/env.schema.ts`
- The database adapter interface (`lib/db/adapter.ts`) — the implementation
  chosen is a one-time init decision, but the interface itself is core
- The organizations/multi-tenant schema
- `scripts/seed.ts`
- `docs/` structure, including the knowledge base (see §11)
- ESLint + Prettier config (see §5)
- The theme system (see §10)

Everything else (auth methods, payments, storage, phone, AI, admin panel, cookie
banner) is flag-gated and must degrade gracefully to "not rendered / not
routable" when its flag is off — never to a broken page or a thrown error.

## 3. Folder Structure Contract

```
/app                    → routes only. No business logic in page.tsx/route.ts beyond
                          calling lib/ functions. Keep route files thin.
/components
  /ui                    → shadcn primitives, unmodified where possible
  /shared                → your own small reusable components (see §9) — NOT feature-specific
  /auth, /admin, etc.    → feature-grouped, reusable within that feature, no route-specific
                          logic baked in
/config
  features.ts             → flag resolution, single source of truth
  env.schema.ts           → Zod validation of env vars, conditional on which flags are on
  theme.ts                → single source of truth for theme tokens (see §10)
/lib
  /db                     → adapter.ts (interface) + /supabase, /mongodb (implementations)
  /auth, /storage, /email, /phone, /ai → same interface+adapter pattern
/docs
  README.md               → index, keep current
  /guides                 → human-readable walkthroughs
  /prompts                → standalone, copy-pasteable prompts (not notes — full prompts)
  /architecture           → feature-flags.md, data-layer.md, overview.md, components.md,
                            theming.md — living reference docs
  /llm-context             → source material for this file and .cursorrules
  /legal-templates
  /knowledge-base          → session/decision log for agent handoff (see §11)
/scripts
  seed.ts
  seed-test.ts             → resets/reseeds the .env.test database (see §12)
/types
.env.example
.env.test.example          → template for test-environment credentials
```

**Rule:** if you're about to put logic in `/app`, stop and ask whether it
belongs in `/lib` instead. Route files should read like a table of contents, not
an implementation.

## 4. TypeScript / JavaScript Standards

- TypeScript strict mode, no `any`. If a type is genuinely unknown, use
  `unknown` and narrow it — don't silence the compiler.
- No implicit `this`, no `var` — `const` by default, `let` only when
  reassignment is real.
- Prefer named exports over default exports, except for Next.js files that
  require a default export (pages, layouts) and single-component files where the
  filename already names the thing.
- Async/await over `.then()` chains. Always wrap awaited calls that can fail in
  try/catch at the boundary where you can produce a typed `AppError` (see §8).
- No barrel files (`index.ts` re-export everything) inside `/lib` adapters —
  they obscure which provider-specific module is actually being imported and
  hurt tree-shaking. Import directly from the specific file.
- Pure functions where possible. Business logic in `/lib` should not depend on
  Next.js request/response objects directly — pass in the data it needs, return
  data, keep it testable.
- Zod at every boundary. Every API route validates its input with a Zod schema
  before doing anything else. Every env var access goes through `env.schema.ts`,
  never raw `process.env.X` in application code.

## 5. React Conventions

- Functional components only, with hooks. No class components, ever.
- Server Components by default. Only add `'use client'` when the component
  genuinely needs interactivity, browser APIs, or hooks like
  `useState`/`useEffect`. Push client boundaries as deep/small as possible —
  don't mark a whole page client just because one button needs a click handler;
  extract that button into its own client component.
- One component per file, file name matches component name in PascalCase
  (`FileUpload.tsx` exports `FileUpload`).
- Props typed with an explicit `interface ComponentNameProps`, not inline object
  types, so they're easy to find, extend, and reuse in docs.
- No prop-drilling past 2 levels — if a value needs to go deeper, use context or
  colocate state closer to where it's needed. Flag this rather than drilling
  silently.
- Composition over configuration. Prefer a component that accepts
  `children`/slots over one with 15 boolean props trying to cover every case. If
  a component starts collecting many boolean props, that's a signal to split it
  or use composition instead.
- No inline styles. Tailwind utility classes only, reading from theme tokens
  (§10) — never a hardcoded hex color or px value that bypasses the theme.
- Accessibility isn't optional: semantic HTML, labeled form fields,
  keyboard-navigable interactive elements, `alt` text — bake this in as you
  build, not as a later pass.

## 6. Linting & Formatting

- ESLint: `next/core-web-vitals` + `@typescript-eslint/recommended`, default
  rule set — no custom overrides unless a specific rule is actively causing
  friction, and any override must be documented with a one-line comment
  explaining why.
- Prettier: default settings (2-space indent, semicolons on, double quotes...
  whatever Prettier's defaults resolve to — don't hand-tune this). Prettier owns
  formatting, ESLint owns code quality; they should not fight each other (use
  `eslint-config-prettier` to disable formatting-related ESLint rules).
- Both run in CI (the `lint` and `typecheck` scripts from Phase 0) and must pass
  before a phase is considered complete.
- Pre-commit hook (optional, Phase-appropriate later): if added, keep it fast —
  lint-staged on changed files only, not a full-repo lint on every commit.

## 7. Adding a New Feature — Standard Procedure

When asked to add any new feature to this template, follow this order, every
time:

1. **Does it need a flag?** Add it to `config/features.ts` and
   `docs/architecture/feature-flags.md` in the same commit.
2. **Does it need new env vars?** Add to `.env.example` (grouped, commented) and
   `env.schema.ts` (conditional on the flag).
3. **Does it need data?** Add the Zod schema, adapter methods (both DB providers
   if it's tenant data), and a seed entry — together.
4. **Can any part of the UI be a reusable component (see §9)?** Check
   `docs/architecture/components.md` first — reuse or extend an existing
   component before writing a new one.
5. **Build the UI reading the flag**, rendering nothing (or a graceful fallback)
   when it's off — never a broken/empty page.
6. **Update the relevant `docs/guides/*.md`** if setup steps changed.
7. **Log the decision in `docs/knowledge-base/`** (see §11).
8. **Give the commit command. Stop.** Do not proceed to unrelated work in the
   same turn.

## 8. What NOT to Do

- Don't add a feature "while you're in there" that wasn't asked for — note it as
  a suggestion instead, let the human decide.
- Don't regenerate a whole file when a targeted edit would do — token cost
  matters here, and it's easier to review a diff than a full rewrite.
- Don't invent env vars without adding them to `.env.example` (or
  `.env.test.example`) in the same change.
- Don't hardcode trial lengths, plan names, colors, fonts, or other configurable
  values — pull from `app_settings` or `config/theme.ts` as appropriate.
- Don't write directly to `organization_id`-less tables for tenant data, even
  "temporarily."
- Don't add a second UI library, second CSS approach, or second
  state-management pattern without an explicit decision from the human — this
  template stays intentionally boring and consistent.
- Don't silently swap the chosen database provider's schema conventions to match
  the other provider's idioms — each adapter should feel native to its own
  backend.
- Don't build or test against production-shaped credentials — see §12.

## 9. Reusable Components — Build Once, Reuse Everywhere

The whole point of this template is not rewriting the same UI logic per project.
Before writing any new component:

1. **Check `docs/architecture/components.md` first.** It's a living catalog of
   every component in `/components/shared` and `/components/ui`: name, purpose,
   props, and where it's used. If something close already exists, extend it (add
   a prop, a variant) rather than duplicating it.
2. If nothing close exists and this pattern is even plausibly reusable (form
   fields, empty states, data tables, modals, confirmation dialogs, file
   uploads, avatars, badges, loading skeletons, pagination, toasts) — build it
   in `/components/shared`, not inline in a page.
3. Every new shared component gets an entry in `docs/architecture/components.md`
   in the same commit: name, one-line purpose, prop signature, and a usage
   example. Treat this file as mandatory, not optional documentation — it's what
   makes reuse actually happen instead of components getting rebuilt because
   nobody remembered they existed.
4. Feature-specific components (e.g. `components/auth/LoginForm.tsx`) stay
   feature-scoped unless a second, unrelated feature needs the same pattern — at
   that point, promote it to `/components/shared` and update the catalog.

## 10. Theming — Single Source of Truth

- `config/theme.ts` holds every design token: colors, font families, spacing
  scale, radii, shadows — as a typed object.
- These tokens are written out as CSS custom properties in `globals.css` at
  build/runtime (e.g. `--color-primary`, `--font-heading`), so both light/dark
  mode and any future theme swap are a matter of changing variable values, not
  hunting through component files.
- `tailwind.config.ts` reads from those same CSS variables
  (`hsl(var(--color-primary))` pattern, same approach shadcn/ui uses) — so
  Tailwind utility classes and raw CSS stay in sync automatically.
- No component ever hardcodes a color, font, or spacing value. If a value isn't
  in the theme yet, add it to `config/theme.ts` first, then use it — don't reach
  for an arbitrary Tailwind value like `text-[#1a2b3c]` as a shortcut.
- Dark mode: token-based (each token has a light and dark value), toggled via a
  `class` strategy on `<html>`, not per-component conditionals.
- Document the full token list and how to add/change a theme in
  `docs/architecture/theming.md`.

## 11. Knowledge Base — Agent Handoff

Because work on this project moves between different AI agents/sessions (Claude
Code, Cursor, different chat sessions), `docs/knowledge-base/` is the shared
memory that makes that handoff lossless. Treat it as seriously as the code
itself.

- `docs/knowledge-base/decisions.md` — an append-only log of non-obvious
  decisions and why they were made (e.g. "chose Twilio Verify over a custom OTP
  flow because X"). Short entries, dated, newest at the top. Not a full
  changelog — only decisions a future agent would otherwise have to re-derive or
  might get wrong by guessing.
- `docs/knowledge-base/current-state.md` — a living snapshot (overwritten, not
  appended) of: which phase the project is on, which flags/providers are
  actually configured in this specific fork, what's intentionally deferred, and
  any known rough edges. Update this at the end of every phase/session — this is
  the single most important file for a new agent to read first.
- `docs/knowledge-base/glossary.md` — project-specific terms/naming that aren't
  self-evident (e.g. what "org" vs "workspace" means here if both appear,
  internal names for things).
- **Rule:** any session that makes a non-trivial decision or finishes a phase
  must update `current-state.md` before ending. This is not optional
  documentation — it's the reason a different agent (or you, three weeks later)
  can pick this up cold.

## 12. Test Environment — Safe Sandbox for AI-Assisted Work

- `.env.test` holds credentials for an isolated test Supabase project / test
  MongoDB cluster — never the same instance as production or even local dev, so
  an agent can run migrations, seed data, or destructive test operations without
  any risk to real data.
- `.env.test.example` documents every var needed, with comments on where to get
  a free-tier test instance for each provider.
- `TEST_MODE=true` is read by `config/env.schema.ts` at boot. When true, the app
  performs a runtime guard: it inspects the resolved DB connection string/project
  ref and refuses to start (throws a loud, explicit error) if that string
  doesn't match an allow-listed test-project pattern you define (e.g. test
  project ref prefix, or a `-test` suffix in the Mongo cluster name). This is a
  deliberate speed bump against accidentally pointing a test run at production.
- `scripts/seed-test.ts` wipes and reseeds the test database on demand
  (`pnpm seed:test`) — safe to run repeatedly, idempotent.
- Any agent asked to "test this" or "try it out" should default to `.env.test`
  credentials unless explicitly told otherwise, and should state which
  environment it's operating against before running anything destructive.

## 13. When Multiple Reasonable Approaches Exist

Ask. Do not silently pick one. Present the options concisely (name each
approach, one line on what it trades off), and wait for a decision before
proceeding — even if it costs a turn. This applies to architectural choices,
library choices, and any decision that would be annoying or costly to reverse
later. It does not apply to trivial implementation details (variable naming,
which shadcn component variant to start from) — use judgment on scale, but
default to asking when unsure whether something is trivial.

## 14. Response Style for This Repo

- Lead with the diff/code, not a restatement of what was asked.
- Keep prose explanations short — a few lines on why, not a tutorial.
- End every phase/feature with the exact git commands to commit, using
  conventional commit format: `feat:`, `fix:`, `chore:`, `docs:`.
- If a request would break §1–§13 above, say so directly before proceeding, and
  propose the compliant version — don't quietly do the non-compliant thing.

## 15. Reference Docs (read these when relevant, don't restate their contents here)

- `docs/architecture/overview.md` — philosophy in more depth
- `docs/architecture/feature-flags.md` — full flag reference, keep current
- `docs/architecture/data-layer.md` — adapter pattern details
- `docs/architecture/components.md` — reusable component catalog, keep current
- `docs/architecture/theming.md` — theme token reference
- `docs/knowledge-base/current-state.md` — read this first, every session
- `docs/knowledge-base/decisions.md`
- `docs/guides/*.md` — setup walkthroughs per feature
- `docs/prompts/*.md` — standalone prompts for common tasks (new CRUD feature,
  seed data, legal docs, debugging)

If you (Claude) are about to explain something already covered in one of these
files, point to the file instead of re-explaining inline — keeps this file and
chat responses short, and keeps one source of truth per topic.
