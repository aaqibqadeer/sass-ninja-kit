/**
 * lib/payments/trials.ts — compute an org's trial end from the platform
 * `app_settings.trialDays` (Phase 5). Called at org creation. Returns null when
 * payments is off or the configured trial length is zero, so a non-billing fork
 * simply gets no trial window.
 */

import { features } from "@/config/features";
import { db } from "@/lib/db";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function resolveTrialEndsAt(): Promise<Date | null> {
  if (!features.payments.enabled) return null;
  const settings = await db.getAppSettings();
  if (!settings.trialDays || settings.trialDays <= 0) return null;
  return new Date(Date.now() + settings.trialDays * DAY_MS);
}
