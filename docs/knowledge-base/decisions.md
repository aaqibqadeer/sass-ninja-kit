# Decisions

> Non-obvious decisions and _why_ (CLAUDE.md §11). Short entries, dated, **newest
> at the top** — only what a future agent would otherwise re-derive or get wrong.
> Recent phases stay here; older entries live in
> [`decisions-archive.md`](./decisions-archive.md). Keep this file small.

## 2026-07-19 — Phase 10: docs finalization (template v1.0.0)

Closes the template. **CLAUDE.md and `.cursorrules` were already complete**, so
per the user's call we **reconciled rather than rewrote**: fixed CLAUDE.md §10
(it still described the Tailwind **v3** `tailwind.config.ts` + `hsl(var(--x))`
model; the fork is v4 CSS-first with `@theme inline` + `oklch` — now matches
`theming.md`) and lightly expanded `.cursorrules` (theming/v4, super-admin
separation, Zod-at-boundary, "read current-state first"). Established the
**prompt-file format** (framing → fenced copy-paste block with `[INPUTS]` →
related-links footer) across all six `docs/prompts/*`. Wrote a full
`getting-started.md` (standardized on **pnpm**, dropped the stub's `npm` +
`seed:test` claims since `seed:test` is still a stub) and a new `deployment.md`
(stresses `NEXT_PUBLIC_*` are build-time and `SKIP_ENV_VALIDATION` is build/CI
only). Refreshed `docs/README.md` (removed the stale "populated later" notes) and
seeded `docs/llm-context/` as a pointer to the distilled rulebook rather than
duplicating content. Marked the template **v1.0.0**.

## 2026-07-19 — Phase 9: SEO metadata, sitemap/robots, cookie banner, legal templates

SEO plumbing is **not flag-gated** (every fork wants it): the root `metadata`
export gained `metadataBase`/title-template/OpenGraph/Twitter/robots, and
`app/sitemap.ts` + `app/robots.ts` build absolute URLs from
`NEXT_PUBLIC_APP_URL`. **Runtime check caught a real bug** — `middleware.ts`
redirected `/robots.txt` and `/sitemap.xml` to `/login` (its matcher catches
them and they weren't public), so both were added to `isPublicPath`. The cookie
banner **is** flag-gated (`cookieBanner`, a flat boolean). Its consent cookie
(`ninjakit_cookie_consent`) is deliberately **client-managed and non-httpOnly**
(unlike the server-set auth/active-org cookies) because the banner must read it in
the browser to decide whether to render — its constant lives in the component,
not `lib/auth/constants.ts`, since it isn't an auth concern. The banner **starts
hidden and reveals after mount** (via `useEffect`) to avoid an SSR hydration
mismatch, and exposes `getCookieConsent()` so a fork can gate analytics on the
choice. It takes an optional `policyHref` rather than hardcoding a `/cookie-policy`
route that doesn't exist yet (no broken link). Legal docs ship as `[PLACEHOLDER]`
**templates** (not routed pages) plus a `generate-legal-docs.md` prompt — the fork
decides whether/how to route them. Verified end-to-end with a headless browser:
banner shows → Accept sets cookie → stays hidden on reload; `/robots.txt` +
`/sitemap.xml` render; metadata present in `<head>`.

## 2026-07-19 — Phase 8: AI integration (Anthropic + OpenAI behind one interface)

Two providers landed behind the standard `@/lib/ai` seam — `AiAdapter` interface
(`generate()` / `stream()`) with `anthropic/` and `openai/` implementations. Two
choices differ from the other adapters. **(1) Official SDKs over raw `fetch`** —
unlike the Twilio/Resend adapters, we added `@anthropic-ai/sdk` and `openai`
(user-confirmed) because they handle streaming and typing cleanly and follow the
Stripe/AWS-SDK precedent; hand-rolling SSE parsing for two providers wasn't worth
it. **(2) Provider-keyed accessor, not a single singleton** — `aiProviders` is an
**array** (several providers enable-able at once), so `lib/ai/index.ts` exposes
`ai(provider?)` with lazy per-provider caching rather than one global instance
like storage/phone/payments. Default provider = optional `AI_DEFAULT_PROVIDER`
env (no secret, no required-when rule) else the first enabled entry. DTOs are
provider-neutral (no SDK type past the seam); default model ids live in
`lib/ai/models.ts` so none are hardcoded in app code (§8). The example route
`app/api/ai/generate` is a non-streaming smoke test following the flag-404 →
`authorize()` → Zod contract; `stream()` exists on the adapter but the repo has
**no shared SSE helper yet** (noted for a future phase). Not runtime-verified
against live provider APIs (no keys here): typecheck + prod build pass, and the
selector/route 404 correctly when AI is off.

---

Earlier entries (Phase 7 and before) are in
[`decisions-archive.md`](./decisions-archive.md).
