/**
 * lib/payments/webhook.ts — apply a normalised payments webhook event to the DB
 * (Phase 5). Keeps the subscription table in sync with the provider's state via
 * the neutral `PaymentsWebhookEvent` union (works for either DB adapter).
 */

import { db } from "@/lib/db";
import { SUBSCRIPTION_STATUSES } from "@/lib/db/schema";

import type { PaymentsWebhookEvent } from "./adapter";

/** Map a provider Price id back to one of our plans. */
async function findPlanIdByPriceId(
  priceId: string | null,
): Promise<string | null> {
  if (!priceId) return null;
  const plans = await db.listPlans();
  const match = plans.find(
    (plan) =>
      plan.stripePriceIdMonthly === priceId ||
      plan.stripePriceIdAnnual === priceId,
  );
  return match?.id ?? null;
}

export async function applyWebhookEvent(
  event: PaymentsWebhookEvent,
): Promise<void> {
  switch (event.kind) {
    case "subscription.synced": {
      const s = event.subscription;
      const org = await db.getOrganizationByStripeCustomerId(
        s.stripeCustomerId,
      );
      const existing =
        (await db.getSubscriptionByStripeId(s.stripeSubscriptionId)) ??
        (org ? await db.getSubscriptionByOrg(org.id) : null);
      const planId = (await findPlanIdByPriceId(s.priceId)) ?? null;

      if (existing) {
        await db.updateSubscription(existing.id, {
          status: s.status,
          stripeCustomerId: s.stripeCustomerId,
          stripeSubscriptionId: s.stripeSubscriptionId,
          currentPeriodEnd: s.currentPeriodEnd,
          cancelAtPeriodEnd: s.cancelAtPeriodEnd,
          ...(planId ? { planId } : {}),
        });
        return;
      }

      // No local record yet — create one when the org + plan both resolve.
      if (org && planId) {
        await db.createSubscription({
          organizationId: org.id,
          planId,
          status: s.status,
          stripeCustomerId: s.stripeCustomerId,
          stripeSubscriptionId: s.stripeSubscriptionId,
          currentPeriodEnd: s.currentPeriodEnd,
          cancelAtPeriodEnd: s.cancelAtPeriodEnd,
        });
      }
      return;
    }
    case "subscription.deleted": {
      const existing = await db.getSubscriptionByStripeId(
        event.stripeSubscriptionId,
      );
      if (existing) {
        await db.updateSubscription(existing.id, {
          status: SUBSCRIPTION_STATUSES.canceled,
          cancelAtPeriodEnd: true,
        });
      }
      return;
    }
    case "ignored":
      return;
  }
}
