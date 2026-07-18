# Feature Flags

**Living source of truth for every flag in the template.** See CLAUDE.md §1, §7.
Every future phase that adds a flag MUST update this table in the same commit.

Every optional feature is gated by a flag resolved in `config/features.ts` from
an environment variable. App code checks `features.*`; it never reads
`process.env` directly and never hardcodes an optional feature as always-on. A
feature whose flag is off degrades to "not rendered / not routable" — never a
broken page.

## How resolution works

- **Toggle vars** use the `NEXT_PUBLIC_FEATURE_` prefix and are resolved with
  `!!process.env.X` (presence = on). Any non-empty value enables the flag —
  including `"0"`/`"false"` — so **disable by omitting the var**, not by setting
  it to false. NEXT_PUBLIC prefix lets the registry resolve identically on
  server and client.
- **Secret vars** (API keys, client secrets) are server-only and **required only
  when their flag is on**. `config/env.schema.ts` validates them at boot and
  throws a message listing exactly which required var is missing and why.

## Flag reference

| Flag (`features.*`)  | Toggle env var                            | Controls                                                                                        | Required secrets when on                                                                         |
| -------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `auth.emailPassword` | `NEXT_PUBLIC_FEATURE_AUTH_EMAIL_PASSWORD` | Email + password sign-in                                                                        | `AUTH_SECRET`                                                                                    |
| `auth.magicLink`     | `NEXT_PUBLIC_FEATURE_AUTH_MAGIC_LINK`     | Passwordless magic-link sign-in                                                                 | `AUTH_SECRET`, `RESEND_API_KEY`                                                                  |
| `auth.oauth.google`  | `NEXT_PUBLIC_FEATURE_AUTH_OAUTH_GOOGLE`   | Google OAuth sign-in                                                                            | `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                                        |
| `auth.oauth.github`  | `NEXT_PUBLIC_FEATURE_AUTH_OAUTH_GITHUB`   | GitHub OAuth sign-in                                                                            | `AUTH_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`                                        |
| `payments`           | `NEXT_PUBLIC_FEATURE_PAYMENTS`            | Stripe billing                                                                                  | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`               |
| `storage`            | `NEXT_PUBLIC_FEATURE_STORAGE`             | File storage                                                                                    | `STORAGE_PROVIDER`                                                                               |
| `phoneVerification`  | `NEXT_PUBLIC_FEATURE_PHONE_VERIFICATION`  | SMS phone verification (Twilio Verify)                                                          | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`                           |
| `admin`              | `NEXT_PUBLIC_FEATURE_ADMIN`               | Admin panel routes/UI                                                                           | _(none)_                                                                                         |
| `aiProviders`        | `NEXT_PUBLIC_FEATURE_AI_PROVIDERS`        | Enabled AI providers (comma-separated: `anthropic`, `openai`)                                   | `ANTHROPIC_API_KEY` (if list includes `anthropic`), `OPENAI_API_KEY` (if list includes `openai`) |
| `multiTenant`        | `NEXT_PUBLIC_FEATURE_MULTI_TENANT`        | Org switching/invites UI. Off = one silent default org per user. Schema is always multi-tenant. | _(none)_                                                                                         |

Notes:

- `aiProviders` is an **array**, not a boolean — the toggle var is a
  comma-separated allow-list, parsed and filtered against the known providers in
  `config/features.ts`. An empty/absent list means AI is off.
- `AUTH_SECRET` is required whenever **any** auth method is enabled
  (`isAnyAuthEnabled` in `config/features.ts`).

## Adding a flag (checklist, per CLAUDE.md §7)

1. Add the flag to `config/features.ts` (resolved via `!!process.env.X`).
2. Add its toggle var and any required secrets to `.env.example` (grouped,
   commented).
3. Add required-when-on rules to `config/env.schema.ts`.
4. Add a row to the table above — same commit.
