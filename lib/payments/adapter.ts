/**
 * lib/payments/adapter.ts — the PaymentsAdapter interface (Phase 5).
 *
 * Mirrors the database-adapter pattern (§1.2): application code imports only
 * this interface (via `@/lib/payments`), never a provider SDK. The concrete
 * implementation lives in ./stripe; the provider is selected once in ./index.ts.
 *
 * Provider-neutral by design — the webhook is normalised into a small union
 * (`PaymentsWebhookEvent`) so no Stripe type leaks past this seam. Monetary
 * amounts are integer MINOR units (cents), matching Stripe's `unit_amount` and
 * the `plans` price columns.
 */

import type { SubscriptionStatus } from "@/lib/db/schema";

export type BillingCadence = "monthly" | "annual";

export interface CreateCustomerInput {
  email: string;
  name?: string | null;
  metadata?: Record<string, string>;
}

export interface CheckoutSessionInput {
  /** The Stripe Price id to subscribe to (resolved from the plan + cadence). */
  priceId: string;
  /** The org's Stripe customer id. */
  customerId: string;
  successUrl: string;
  cancelUrl: string;
  /** Optional trial end applied to the subscription (ignored if in the past). */
  trialEnd?: Date | null;
  /** Metadata attached to the subscription (e.g. organizationId, planId). */
  metadata?: Record<string, string>;
}

export interface CreatePriceInput {
  /** Existing Stripe Product to attach the Price to; a new one is created if omitted. */
  productId?: string | null;
  /** Used only when a new Product must be created. */
  productName: string;
  /** Integer minor units (cents). */
  unitAmount: number;
  currency?: string;
  interval: "month" | "year";
}

/** Provider-neutral snapshot of a subscription, derived from a webhook event. */
export interface NormalizedSubscription {
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  /** The active Price id — used to map the subscription back to a plan. */
  priceId: string | null;
}

export type PaymentsWebhookEvent =
  | { kind: "subscription.synced"; subscription: NormalizedSubscription }
  | { kind: "subscription.deleted"; stripeSubscriptionId: string }
  | { kind: "ignored"; type: string };

export interface PaymentsAdapter {
  /** Create a provider customer for an org (linked via metadata). */
  createCustomer(input: CreateCustomerInput): Promise<{ customerId: string }>;

  /** Start a hosted subscription checkout; returns the redirect URL. */
  createCheckoutSession(input: CheckoutSessionInput): Promise<{ url: string }>;

  /** Open the hosted billing/customer portal; returns the redirect URL. */
  createBillingPortalSession(input: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ url: string }>;

  /** Cancel a subscription immediately. */
  cancelSubscription(stripeSubscriptionId: string): Promise<void>;

  /**
   * Refund a charge. `amount` (integer minor units) is OPTIONAL: omitted refunds
   * the full charge; provided issues a partial refund. Implementations MUST
   * validate `amount` against the original charge total and reject an over-refund.
   */
  refundSubscription(
    chargeId: string,
    amount?: number,
  ): Promise<{ refundId: string }>;

  /**
   * Create a new Price (Stripe Prices are immutable — a price change makes a NEW
   * Price and relinks the plan; never mutate one in place — §15). Returns the
   * new Price id and the Product it belongs to.
   */
  createPrice(
    input: CreatePriceInput,
  ): Promise<{ priceId: string; productId: string }>;

  /** Archive a Price (used when superseding it with a new one). */
  deactivatePrice(priceId: string): Promise<void>;

  /**
   * The most recent charge for a customer, used to pre-fill (and bound) a refund
   * amount in the admin UI. `amount` is integer minor units. Null when none.
   */
  getLatestCharge(
    customerId: string,
  ): Promise<{ chargeId: string; amount: number; currency: string } | null>;

  /** Verify a webhook signature and normalise the event. */
  parseWebhookEvent(
    rawBody: string,
    signature: string,
  ): Promise<PaymentsWebhookEvent>;
}
