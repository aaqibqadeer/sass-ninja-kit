/**
 * lib/payments/plans.ts — reconcile a plan's Stripe Prices on create/edit
 * (Phase 7, §15). Honors Stripe Price immutability: a changed amount creates a
 * NEW Price and archives the old one; it never mutates a Price in place.
 *
 * No-ops when payments is off — plan rows are still saved (a fork can run the
 * admin panel with `admin` on but `payments` off), just without Stripe ids.
 */

import { features } from "@/config/features";
import type { Plan } from "@/lib/db/schema";

import { payments } from "./index";

export interface PlanPriceInput {
  name: string;
  /** Integer minor units (cents). */
  priceMonthly: number;
  /** Integer minor units (cents), or null. */
  priceAnnual: number | null;
}

export interface PlanStripeIds {
  stripeProductId: string | null;
  stripePriceIdMonthly: string | null;
  stripePriceIdAnnual: string | null;
}

/**
 * Return the Stripe id fields to persist for a plan. `existing` is the current
 * plan on edit, or null on create.
 */
export async function syncStripePrices(
  existing: Plan | null,
  input: PlanPriceInput,
): Promise<PlanStripeIds> {
  const current: PlanStripeIds = {
    stripeProductId: existing?.stripeProductId ?? null,
    stripePriceIdMonthly: existing?.stripePriceIdMonthly ?? null,
    stripePriceIdAnnual: existing?.stripePriceIdAnnual ?? null,
  };
  if (!features.payments.enabled) return current;

  let productId = current.stripeProductId;

  // Monthly price — (re)create when new or when the amount changed.
  let monthlyId = current.stripePriceIdMonthly;
  const monthlyChanged =
    existing === null ||
    existing.priceMonthly !== input.priceMonthly ||
    monthlyId === null;
  if (input.priceMonthly > 0 && monthlyChanged) {
    const created = await payments.createPrice({
      productId,
      productName: input.name,
      unitAmount: input.priceMonthly,
      interval: "month",
    });
    productId = created.productId;
    if (monthlyId) await payments.deactivatePrice(monthlyId);
    monthlyId = created.priceId;
  }

  // Annual price — only when annual billing is enabled and an amount is set.
  let annualId = current.stripePriceIdAnnual;
  if (
    features.payments.annualBilling &&
    input.priceAnnual &&
    input.priceAnnual > 0
  ) {
    const annualChanged =
      existing === null ||
      existing.priceAnnual !== input.priceAnnual ||
      annualId === null;
    if (annualChanged) {
      const created = await payments.createPrice({
        productId,
        productName: input.name,
        unitAmount: input.priceAnnual,
        interval: "year",
      });
      productId = created.productId;
      if (annualId) await payments.deactivatePrice(annualId);
      annualId = created.priceId;
    }
  }

  return {
    stripeProductId: productId,
    stripePriceIdMonthly: monthlyId,
    stripePriceIdAnnual: annualId,
  };
}
