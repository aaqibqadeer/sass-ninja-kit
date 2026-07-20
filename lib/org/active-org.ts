/**
 * lib/org/active-org.ts — the active-organization cookie (workspace switcher).
 * Node-only (next/headers). The READ side lives in `lib/auth/org.ts`
 * (`resolveActiveOrgContext`), which validates the cookie against the user's
 * memberships; this module only sets/clears it from route handlers.
 */

import { cookies } from "next/headers";

import { ACTIVE_ORG_COOKIE, sessionCookieOptions } from "@/lib/auth/constants";

const ACTIVE_ORG_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

/** Point the session at `organizationId` on subsequent requests. */
export async function setActiveOrgCookie(
  organizationId: string,
): Promise<void> {
  const store = await cookies();
  store.set(ACTIVE_ORG_COOKIE, organizationId, {
    ...sessionCookieOptions,
    maxAge: ACTIVE_ORG_MAX_AGE_SECONDS,
  });
}

/** Forget the active org (falls back to the default membership). */
export async function clearActiveOrgCookie(): Promise<void> {
  const store = await cookies();
  store.delete(ACTIVE_ORG_COOKIE);
}
