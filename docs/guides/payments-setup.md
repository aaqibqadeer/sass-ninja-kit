# Payments Setup (Stripe)

Billing is **flag-gated**. With `payments` off, no billing routes exist, no
Stripe secret is required, and `hasAccess()` returns `true` for everything — the
template runs as a free product. Turn it on to add subscriptions.

This guide covers the **data layer + adapter** (Phase 5). The super-admin plan
CRUD and cross-org subscription/refund UI are Phase 7.

## Enable

```env
# Master switch
NEXT_PUBLIC_FEATURE_PAYMENTS=1
# Optional: annual cadence (plans expose priceAnnual + discount; checkout offers monthly/annual)
NEXT_PUBLIC_FEATURE_PAYMENTS_ANNUAL_BILLING=1

# Required when payments is on (validated at boot by config/env.schema.ts):
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

`annualBilling` unlocks no extra secret — it's a cadence flag only, and toggling
it needs no schema change (§15).

## Stripe dashboard setup

1. Create a Stripe account and grab the **test-mode** keys from
   **Developers → API keys** (`sk_test_…`, `pk_test_…`).
2. You do **not** hand-create Products/Prices in the dashboard for this template —
   the app creates them. When a super admin saves a plan price (Phase 7), the
   payments adapter calls `createPrice()`, which creates the Stripe Product/Price
   and stores the ids on the plan (`stripe_product_id`, `stripe_price_id_monthly`,
   `stripe_price_id_annual`).
3. Seed data ships **3 placeholder plans** (Starter/Pro/Enterprise) with no Stripe
   ids yet — set their prices from the admin panel to mint the Stripe Prices.

## Webhook setup

The app keeps subscription status in the DB via a webhook.

1. **Local dev** — use the Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3000/api/payments/webhook
   ```
   Copy the `whsec_…` it prints into `STRIPE_WEBHOOK_SECRET`.
2. **Production** — **Developers → Webhooks → Add endpoint**, URL
   `https://<your-domain>/api/payments/webhook`. Subscribe to at least:
   `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`. Copy the signing secret into
   `STRIPE_WEBHOOK_SECRET`.

The webhook route is **public** (bypasses the login redirect in `middleware.ts`)
because it's authenticated by the Stripe **signature**, not a session cookie. It
reads the raw request body for signature verification, verifies against
`STRIPE_WEBHOOK_SECRET`, normalises the event, and upserts the matching
`subscriptions` row (mapping the Price id back to a plan).

## Stripe Price immutability (read this — common gotcha)

**Stripe Price objects cannot be edited in place.** When a super admin changes a
plan's price, the adapter (`lib/payments/`) does NOT mutate the existing Price —
it:

1. creates a **new** Stripe Price (`createPrice()`),
2. archives the old one (`deactivatePrice()` → `active: false`),
3. relinks the plan's `stripe_price_id_*` to the new Price.

Existing subscribers **stay on their original price** unless a super admin
explicitly migrates them — they are never silently repriced. Do not "fix" this by
trying to update a Stripe Price directly; that call will fail and it's the wrong
model. Monetary amounts everywhere are **integer minor units (cents)**, matching
Stripe's `unit_amount`.

## Trials

`app_settings.trialDays` (default 14, admin-editable) is read by
`resolveTrialEndsAt()` at org creation to stamp `organizations.trialEndsAt`. That
trial end is passed to Checkout as the subscription's `trial_end`. Set
`trialDays` to 0 to disable trials.

## Local testing

```bash
pnpm seed            # seeds 3 placeholder plans + the app_settings row
stripe listen --forward-to localhost:3000/api/payments/webhook   # in another terminal
```

Then, as a super admin, open the admin panel (Phase 7) to set plan prices, and
subscribe from the app to exercise checkout → webhook → subscription sync.

## What's flag-gated where

- `payments` off → `/api/payments/*` routes 404; `hasAccess()` returns `true`.
- `payments.annualBilling` off → annual price fields/toggle are hidden; only
  `priceMonthly` is used.
- See `docs/architecture/feature-flags.md` and
  `docs/architecture/data-layer.md#phase-5--payments--pricing-tables`.
