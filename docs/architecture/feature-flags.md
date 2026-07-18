# Feature Flags

Living reference for every flag in the template. See CLAUDE.md §1 and §7.

Every optional feature is gated by a flag resolved from an environment variable
in `config/features.ts` (single source of truth). App code checks the flag; it
never reads `process.env` directly and never hardcodes an optional feature as
always-on. A feature whose flag is off must degrade gracefully to "not rendered
/ not routable" — never a broken page.

## Adding a flag

When a phase introduces an optional feature, in the **same commit**:

1. Add the flag to `config/features.ts` (resolved from its env var).
2. Add the backing env var to `.env.example` (grouped, commented).
3. Validate that var conditionally in `config/env.schema.ts` (only required when
   the flag is on).
4. Add a row to the table below.

## Flag reference

| Flag       | Env var | Default | Gates | Added in |
| ---------- | ------- | ------- | ----- | -------- |
| _none yet_ | —       | —       | —     | —        |

> Phase 0.5 ships the empty flag registry (`config/features.ts`) and this
> reference. Flags are filled in as each phase adds the feature it controls.
