/**
 * lib/auth/org.ts — org-context helpers shared by both auth adapters. Node-only
 * (imports the db adapter). Enforces the multi-tenant-by-default rule (§1.3):
 * every user has at least one org — a silent default one when they don't create
 * their own.
 */

import { db } from "@/lib/db";
import { ORG_ROLES } from "@/lib/db/schema";

import type { AuthUser } from "./types";

/** The user's default (first) organization id, or null if they have none. */
export async function resolveDefaultOrganizationId(
  userId: string,
): Promise<string | null> {
  const memberships = await db.listMembershipsForUser(userId);
  return memberships[0]?.organizationId ?? null;
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
