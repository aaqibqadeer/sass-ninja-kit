/**
 * lib/payments/index.ts — the ONE place that selects the payments provider,
 * mirroring lib/db/index.ts. App code does `import { payments } from
 * "@/lib/payments"` and never touches the Stripe SDK or a concrete adapter.
 *
 * There's a single provider today (Stripe); a fork swaps it here the same way
 * the database adapter is swapped. Construction is lazy (first use) and guarded
 * by the `payments` flag — the adapter is only ever reached from flag-gated
 * routes, so calling it while payments is off is a programming error.
 */

import { features } from "@/config/features";

import type { PaymentsAdapter } from "./adapter";
import { StripeAdapter } from "./stripe/adapter";

function createAdapter(): PaymentsAdapter {
  if (!features.payments.enabled) {
    throw new Error(
      "payments adapter used while payments is disabled — set NEXT_PUBLIC_FEATURE_PAYMENTS",
    );
  }
  return new StripeAdapter();
}

let instance: PaymentsAdapter | null = null;
function getInstance(): PaymentsAdapter {
  return (instance ??= createAdapter());
}

export const payments: PaymentsAdapter = new Proxy({} as PaymentsAdapter, {
  get(_target, prop) {
    const target = getInstance() as unknown as Record<PropertyKey, unknown>;
    const value = target[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(target)
      : value;
  },
});

export type {
  PaymentsAdapter,
  PaymentsWebhookEvent,
  NormalizedSubscription,
  BillingCadence,
  CheckoutSessionInput,
  CreatePriceInput,
} from "./adapter";
