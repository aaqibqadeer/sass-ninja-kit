/**
 * lib/payments/stripe/adapter.ts — Stripe implementation of PaymentsAdapter.
 *
 * The only module that imports the Stripe SDK. Everything provider-specific
 * (SDK calls, webhook signature verification, status mapping, the Price
 * immutability rule) is contained here; callers see only the neutral interface.
 */

import Stripe from "stripe";

import { env } from "@/config/env.schema";
import {
  SUBSCRIPTION_STATUSES,
  type SubscriptionStatus,
} from "@/lib/db/schema";

import type {
  CheckoutSessionInput,
  CreateCustomerInput,
  CreatePriceInput,
  NormalizedSubscription,
  PaymentsAdapter,
  PaymentsWebhookEvent,
} from "../adapter";

function requireSecret(): string {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("StripeAdapter: STRIPE_SECRET_KEY is not configured");
  }
  return env.STRIPE_SECRET_KEY;
}

/** Map Stripe's subscription status to our domain enum. */
function mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "trialing":
      return SUBSCRIPTION_STATUSES.trialing;
    case "active":
      return SUBSCRIPTION_STATUSES.active;
    case "past_due":
    case "unpaid":
      return SUBSCRIPTION_STATUSES.past_due;
    case "canceled":
    case "incomplete_expired":
      return SUBSCRIPTION_STATUSES.canceled;
    default:
      // incomplete | paused | anything future
      return SUBSCRIPTION_STATUSES.incomplete;
  }
}

/**
 * The current-period-end moved from the Subscription to its items across recent
 * Stripe API versions. Read it defensively from either location.
 */
function extractPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const item = subscription.items?.data?.[0] as
    { current_period_end?: number } | undefined;
  const unix =
    item?.current_period_end ??
    (subscription as unknown as { current_period_end?: number })
      .current_period_end;
  return typeof unix === "number" ? new Date(unix * 1000) : null;
}

function normalizeSubscription(
  subscription: Stripe.Subscription,
): NormalizedSubscription {
  const customer = subscription.customer;
  return {
    stripeSubscriptionId: subscription.id,
    stripeCustomerId:
      typeof customer === "string" ? customer : (customer?.id ?? ""),
    status: mapStatus(subscription.status),
    currentPeriodEnd: extractPeriodEnd(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    priceId: subscription.items?.data?.[0]?.price?.id ?? null,
  };
}

export class StripeAdapter implements PaymentsAdapter {
  private readonly stripe: Stripe;

  constructor(stripe?: Stripe) {
    this.stripe = stripe ?? new Stripe(requireSecret());
  }

  async createCustomer(
    input: CreateCustomerInput,
  ): Promise<{ customerId: string }> {
    const customer = await this.stripe.customers.create({
      email: input.email,
      name: input.name ?? undefined,
      metadata: input.metadata,
    });
    return { customerId: customer.id };
  }

  async createCheckoutSession(
    input: CheckoutSessionInput,
  ): Promise<{ url: string }> {
    const trialEndUnix =
      input.trialEnd && input.trialEnd.getTime() > Date.now()
        ? Math.floor(input.trialEnd.getTime() / 1000)
        : undefined;

    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      customer: input.customerId,
      line_items: [{ price: input.priceId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      subscription_data: {
        ...(trialEndUnix ? { trial_end: trialEndUnix } : {}),
        metadata: input.metadata,
      },
    });
    if (!session.url) {
      throw new Error("stripe createCheckoutSession: no redirect URL returned");
    }
    return { url: session.url };
  }

  async createBillingPortalSession(input: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: input.customerId,
      return_url: input.returnUrl,
    });
    return { url: session.url };
  }

  async cancelSubscription(stripeSubscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.cancel(stripeSubscriptionId);
  }

  async refundSubscription(
    chargeId: string,
    amount?: number,
  ): Promise<{ refundId: string }> {
    // Runtime guard against an over-refund (§15). The route also Zod-validates
    // `amount`, but the authoritative total lives on the charge.
    const charge = await this.stripe.charges.retrieve(chargeId);
    const chargeTotal = charge.amount;
    if (amount !== undefined) {
      if (!Number.isInteger(amount) || amount <= 0) {
        throw new Error("refund amount must be a positive integer (cents)");
      }
      if (amount > chargeTotal) {
        throw new Error(
          `refund amount ${amount} exceeds charge total ${chargeTotal}`,
        );
      }
    }
    const refund = await this.stripe.refunds.create({
      charge: chargeId,
      ...(amount !== undefined ? { amount } : {}),
    });
    return { refundId: refund.id };
  }

  async createPrice(
    input: CreatePriceInput,
  ): Promise<{ priceId: string; productId: string }> {
    const productId =
      input.productId ??
      (await this.stripe.products.create({ name: input.productName })).id;

    const price = await this.stripe.prices.create({
      product: productId,
      unit_amount: input.unitAmount,
      currency: input.currency ?? "usd",
      recurring: { interval: input.interval },
    });
    return { priceId: price.id, productId };
  }

  async deactivatePrice(priceId: string): Promise<void> {
    await this.stripe.prices.update(priceId, { active: false });
  }

  async getLatestCharge(
    customerId: string,
  ): Promise<{ chargeId: string; amount: number; currency: string } | null> {
    const charges = await this.stripe.charges.list({
      customer: customerId,
      limit: 1,
    });
    const charge = charges.data[0];
    if (!charge) return null;
    return {
      chargeId: charge.id,
      amount: charge.amount,
      currency: charge.currency,
    };
  }

  async parseWebhookEvent(
    rawBody: string,
    signature: string,
  ): Promise<PaymentsWebhookEvent> {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw new Error("StripeAdapter: STRIPE_WEBHOOK_SECRET is not configured");
    }
    const event = this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.resumed":
      case "customer.subscription.paused":
        return {
          kind: "subscription.synced",
          subscription: normalizeSubscription(
            event.data.object as Stripe.Subscription,
          ),
        };
      case "customer.subscription.deleted":
        return {
          kind: "subscription.deleted",
          stripeSubscriptionId: (event.data.object as Stripe.Subscription).id,
        };
      default:
        return { kind: "ignored", type: event.type };
    }
  }
}
