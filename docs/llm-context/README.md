# LLM Context — source material

This folder holds the source notes that the root **`CLAUDE.md`** and
**`.cursorrules`** are distilled from. Those two files are the _authoritative_
instructions agents load; this folder is where their raw reasoning lives so a
future maintainer can see _why_ a rule exists before editing it.

## The distilled outputs (edit these to change agent behavior)

- **`/CLAUDE.md`** — the full rulebook, auto-loaded by Claude Code every session.
  17 sections: philosophy, folder contract, TS/React standards, the feature
  procedure (§7), reusable components (§9), theming (§10), knowledge base (§11),
  roles/super-admin (§14), pricing/billing (§15).
- **`/.cursorrules`** — a condensed mirror of the same rules for Cursor.

## Keeping them in sync

When you change a convention, update **both** the distilled file(s) and, if the
rationale is non-obvious, add a note here and/or in
`docs/knowledge-base/decisions.md`. Keep `CLAUDE.md` and `.cursorrules` saying the
same thing — the condensed Cursor rules should never contradict the full rulebook.

## Where the rest of the "context" already lives

Most durable context is already structured elsewhere and shouldn't be duplicated
here — point to it instead:

- **What's built / configured in this fork** → `knowledge-base/current-state.md`
- **Why choices were made** → `knowledge-base/decisions.md`
- **Flags / adapters / components / theming** → `architecture/*.md`
- **Setup walkthroughs** → `guides/*.md`
