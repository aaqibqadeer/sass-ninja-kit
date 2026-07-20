# Glossary

> Project-specific terms and naming that aren't self-evident (CLAUDE.md §11).
> Fill in as terms emerge — e.g. what "org" vs "workspace" means here, internal
> names for things.

| Term               | Meaning                                                                                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| org / organization | The tenant boundary (`organizations` table). "Workspace" is the user-facing label for the same thing in the switcher UI — no separate entity.            |
| org role           | A member's role **within one org** (`organization_members.role`): `admin` \| `user`, extensible via `config/permissions.ts`. Scoped to that org.         |
| super admin        | Platform-level tier (`users.is_super_admin`), independent of any org/role and of `multiTenant`. Guarded by `requireSuperAdmin()` — never `requireRole`.  |
| active org         | The org a session currently acts in. Selected by the `ninjakit_active_org` cookie, re-validated against memberships each request; defaults to first.     |
| default org        | The silent org auto-created per user (`ensureDefaultOrganization`, slug `org-<userId>`). The only org in single-tenant mode.                             |
| feature flag       | A boolean (or array, for `aiProviders`) in `config/features.ts` resolved from a `NEXT_PUBLIC_FEATURE_*` env var. Presence = on. Gates optional features. |
| adapter            | One interface (e.g. `DatabaseAdapter`, `AiAdapter`) with provider-specific implementations behind it; app code imports the interface only, never an SDK. |
| table triad        | The rule (§1.4) that a new table ships three things in one commit: a Zod schema, a `scripts/seed.ts` entry, and an adapter method.                       |
| AI provider        | An enabled entry in the `aiProviders` array (`anthropic` \| `openai`), each with an adapter under `lib/ai/<provider>/`. Accessed via `ai(provider?)`.    |
| consent cookie     | `ninjakit_cookie_consent` — client-managed (non-httpOnly) record of the cookie-banner choice (`accepted` \| `rejected`); read via `getCookieConsent()`.  |
