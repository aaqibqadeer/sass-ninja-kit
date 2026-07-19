/**
 * lib/auth/org.ts — org-context helpers shared by both auth adapters. Node-only
 * (imports the db adapter). Enforces the multi-tenant-by-default rule (§1.3):
 * every user has at least one org — a silent default one when they don't create
 * their own.
 */

import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { ORG_ROLES } from "@/lib/db/schema";

import { ACTIVE_ORG_COOKIE } from "./constants";
import type { AuthUser } from "./types";

/** The user's default (first) organization id, or null if they have none. */
export async function resolveDefaultOrganizationId(
  userId: string,
): Promise<string | null> {
  const memberships = await db.listMembershipsForUser(userId);
  return memberships[0]?.organizationId ?? null;
}

/**
 * Resolve the active organization + the user's role in it for a session. Reads
 * the active-org cookie (set by the workspace switcher) and validates it against
 * the user's memberships — an unknown/stale cookie silently falls back to the
 * default (first) membership. Returns nulls when the user has no membership.
 *
 * This is the single source of both `Session.organizationId` and `Session.role`,
 * so a switcher works in multi-tenant mode and the silent single-org path (§1.3)
 * still resolves correctly when the flag is off (no cookie → first org).
 */
export async function resolveActiveOrgContext(
  userId: string,
): Promise<{ organizationId: string | null; role: string | null }> {
  const memberships = await db.listMembershipsForUser(userId);
  if (memberships.length === 0) return { organizationId: null, role: null };

  let selected = memberships[0];
  try {
    const store = await cookies();
    const active = store.get(ACTIVE_ORG_COOKIE)?.value;
    if (active) {
      const match = memberships.find((m) => m.organizationId === active);
      if (match) selected = match;
    }
  } catch {
    // `cookies()` is unavailable outside a request scope — use the default.
  }
  return { organizationId: selected.organizationId, role: selected.role };
}

/**
 * Ensure a user has a default org + admin membership; returns its id. Idempotent
 * for users who already belong to an org. The default org's slug is derived from
 * the user id so it's unique per user.
 */
export async function ensureDefaultOrganization(
  user: AuthUser,
): Promise<string> {
  const existing = await resolveDefaultOrganizationId(user.id);
  if (existing) return existing;

  const handle = user.email.split("@")[0] || "workspace";
  const org = await db.createOrganization({
    name: `${handle}'s Organization`,
    slug: `org-${user.id}`,
  });
  await db.addMember({
    organizationId: org.id,
    userId: user.id,
    role: ORG_ROLES.admin,
  });
  return org.id;
}
