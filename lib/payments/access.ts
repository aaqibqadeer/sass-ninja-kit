/**
 * lib/payments/access.ts — the single feature-gating helper (§15, Phase 5).
 *
 * `hasAccess(session, feature)` reads the entitlement from the session org's
 * active plan `limits` JSON. It ALWAYS returns true when payments is off, so
 * feature-gating call sites never need their own payments-on/off branch — this
 * is the one place that knows about the flag. Numeric quotas can be read
 * directly from `plan.limits` by callers; this helper answers the boolean
 * "is this feature available?" question.
 */

import { features } from "@/config/features";
import { db, SUBSCRIPTION_STATUSES } from "@/lib/db";
import type { Session } from "@/lib/auth/types";

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string")
    return value.length > 0 && value !== "false" && value !== "0";
  // A non-empty object/array counts as "present" (e.g. an enabled feature blob).
  if (value && typeof value === "object") return true;
  return false;
}

export async function hasAccess(
  session: Session,
  feature: string,
): Promise<boolean> {
  if (!features.payments.enabled) return true;

  const organizationId = session.organizationId;
  if (!organizationId) return false;

  const subscription = await db.getSubscriptionByOrg(organizationId);
  const isLive =
    subscription &&
    (subscription.status === SUBSCRIPTION_STATUSES.active ||
      subscription.status === SUBSCRIPTION_STATUSES.trialing);
  if (!subscription || !isLive) return false;

  const plan = await db.getPlanById(subscription.planId);
  if (!plan || !plan.isActive) return false;

  return toBoolean(plan.limits?.[feature]);
}
