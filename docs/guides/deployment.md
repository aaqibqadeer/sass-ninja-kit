# Deployment

Ship a ninjakit fork to production. The template targets **Vercel** but runs
anywhere that can build and serve a Next.js 15 app.

## 1. Environment variables

Set the same vars you use locally, with production values, in your host's env UI
(not committed). Required in every deployment:

- `DB_PROVIDER` + the chosen provider's connection vars (production DB, not the
  test instance).
- `NEXT_PUBLIC_APP_URL` — your real origin, e.g. `https://app.example.com`. This
  drives OAuth redirect URIs, email links, `metadataBase`, `sitemap.xml`, and
  `robots.txt`. Getting it wrong breaks all of those.
- Every `NEXT_PUBLIC_FEATURE_*` toggle you want on, plus the secrets each enabled
  flag requires (`config/env.schema.ts` throws at boot naming any that's missing;
  see `docs/architecture/feature-flags.md`).
- `SUPER_ADMIN_EMAIL` if you seed in prod.

> **`NEXT_PUBLIC_*` are build-time.** They're inlined when you build, so set them
> **before** the production build and rebuild after changing any of them.
> Never set `SKIP_ENV_VALIDATION` at runtime in production — it exists only for
> builds/CI without secrets.

## 2. Build & start

```bash
pnpm install
pnpm build
pnpm start        # serves the production build
```

On Vercel the framework preset handles build/start; just configure env vars and
deploy. Node 20+.

## 3. Database

- **Supabase:** use the production project's URL + keys (the adapter uses the
  **service-role** key server-side). Apply your schema/RLS — SQL migration files
  are not generated in the template (documented in `data-layer.md`); create tables
  matching `lib/db/schema.ts`.
- **MongoDB:** a managed cluster (e.g. Atlas) via `MONGODB_URI`.

Run `pnpm seed` once against production only if you want the sample plans/admin;
otherwise create the super-admin and plans through the admin panel.

## 4. Stripe (if `payments` is on)

- Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
- Add a webhook endpoint in the Stripe dashboard pointing at
  `${NEXT_PUBLIC_APP_URL}/api/payments/webhook`. That route is public
  (signature-verified, exempt from the login redirect in `middleware.ts`) — paste
  its signing secret into `STRIPE_WEBHOOK_SECRET`.
- See `docs/guides/payments-setup.md` (incl. the Price-immutability behavior).

## 5. Auth & OAuth (if enabled)

- `AUTH_SECRET` (32+ random chars) is required for any auth method.
- OAuth callback/redirect URLs must use the production origin:
  `${NEXT_PUBLIC_APP_URL}/api/auth/callback/<provider>`. Update Google/GitHub (and
  Supabase provider settings) accordingly. See `docs/guides/auth-setup.md`.

## 6. Post-deploy smoke test

- App loads; `/robots.txt` and `/sitemap.xml` return (absolute URLs use your prod
  origin).
- Sign up → log in → reach `/dashboard`.
- If payments are on, a test checkout reaches Stripe and the webhook records the
  subscription.
- If the cookie banner is on, Accept/Reject persists across reloads.

## Other hosts

Any Node host works: build with `pnpm build`, run `pnpm start` behind your
process manager/reverse proxy, and provide the same env vars. Containerize from a
`node:20` base if you prefer.
