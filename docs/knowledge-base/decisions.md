# Decisions

> Append-only log of non-obvious decisions and _why_ (CLAUDE.md §11). Short
> entries, dated, **newest at the top**. Only decisions a future agent would
> otherwise have to re-derive or might get wrong by guessing.

## 2026-07-18 — Foundational architecture: flags + adapters, multi-tenant, catalog

The template is built config-driven: every optional feature is gated by a flag
resolved from env vars in `config/features.ts`, and every swappable concern
(database, storage, email, AI) sits behind a single interface with concrete
adapters, so a fork changes behavior by editing config, not by rewriting code.
It is multi-tenant by default — every tenant-scoped table carries
`organization_id` and single-tenant forks just get one silent default org —
because retrofitting tenancy later is far more expensive than carrying an
unused org row. Reusable UI is tracked in a mandatory component catalog
(`docs/architecture/components.md`) so components get reused across forks
instead of silently rebuilt. Together these keep the template cheap to fork
repeatedly, which is its entire purpose.

## 2026-07-18 — Tailwind v4 kept; CLAUDE.md §10 adapted to CSS-first theming

Phase 0 scaffolded on Tailwind **v4**, which has no `tailwind.config.ts` and is
CSS-first, whereas CLAUDE.md §10 describes the v3 model (`tailwind.config.ts` +
`hsl(var(--x))`). We kept v4 rather than downgrading, and adapted §10's intent:
`config/theme.ts` stays the typed source of truth, its values are mirrored into
`app/globals.css` as CSS custom properties, and Tailwind reads them via the
`@theme inline` block. The single-source-of-truth and "no hardcoded values"
rules are preserved; only the wiring mechanism differs from the doc. Trade-off:
`theme.ts` and `globals.css` must be kept in sync by hand until an optional
codegen step is added.
