# Auth Setup

Core auth (Phase 3). Which backend runs is decided by `DB_PROVIDER`:

- **Supabase** (`DB_PROVIDER=supabase`) → **Supabase Auth** (sessions in
  Supabase cookies via `@supabase/ssr`).
- **MongoDB** (`DB_PROVIDER=mongodb`) → a custom **JWT + bcrypt** flow (session
  in an httpOnly cookie; reset/magic-link tokens are stateless signed JWTs).

App code never branches on this — everything goes through `@/lib/auth`
(`auth.signIn`, `auth.signUp`, `auth.getSession`, …) and the `requireAuth()`
server helper / `middleware.ts` guard.

## Enable methods

Each method is independently flag-gated (see
`docs/architecture/feature-flags.md`). Turn on only what you need:

```env
NEXT_PUBLIC_FEATURE_AUTH_EMAIL_PASSWORD=1
NEXT_PUBLIC_FEATURE_AUTH_MAGIC_LINK=1
NEXT_PUBLIC_FEATURE_AUTH_OAUTH_GOOGLE=1
NEXT_PUBLIC_FEATURE_AUTH_OAUTH_GITHUB=1

AUTH_SECRET=<random 32+ chars>          # required for any method (custom-flow JWTs)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

The login/signup/reset UI renders only the enabled methods (the forms read
`config/features.ts`). OAuth buttons additionally require a configured client id.

## Email delivery (MongoDB flow)

Magic-link and password-reset emails use the Resend HTTP API when
`RESEND_API_KEY` is set; otherwise the link is logged to the server console (dev
fallback). Supabase sends these emails itself — no Resend needed.

```env
RESEND_API_KEY=<key>          # required when magicLink is on (Mongo flow)
AUTH_EMAIL_FROM=you@yourdomain.com
```

## OAuth app setup

Set the callback/redirect URL to
`${NEXT_PUBLIC_APP_URL}/api/auth/callback/<provider>`. In production, use your
real domain.

### Google

1. Google Cloud Console → **APIs & Services → Credentials**.
2. **Create Credentials → OAuth client ID → Web application**.
3. Authorized redirect URI:
   `http://localhost:3000/api/auth/callback/google` (+ your prod URL).
4. Copy the client id/secret:
   ```env
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```
5. **Supabase:** also enable Google in **Authentication → Providers** and paste
   the same credentials; set the Supabase callback there. The app redirect URL
   above still applies.

### GitHub

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Authorization callback URL:
   `http://localhost:3000/api/auth/callback/github` (+ your prod URL).
3. Copy the client id/secret:
   ```env
   GITHUB_CLIENT_ID=...
   GITHUB_CLIENT_SECRET=...
   ```
4. **Supabase:** enable GitHub in **Authentication → Providers** with the same
   credentials.

> Only providers whose flag is on **and** whose client id is present are wired
> up — a flag with no client id renders no button and the start route redirects
> back to login.

## Routes & guards

- Pages: `/login`, `/signup`, `/reset-password`, and the protected `/dashboard`.
- API: `/api/auth/{signup,login,logout,magic-link,reset/*,oauth/[provider],callback/[provider]}`.
- `middleware.ts` redirects unauthenticated users to `/login?next=…`. Guard
  Server Components with `requireAuth()` from `@/lib/auth/server`.

## Local testing

Seeded users (`pnpm seed`) get password `Password123!`
(`admin@example.com` / `user@example.com`) so email/password sign-in works
immediately against a seeded database.
