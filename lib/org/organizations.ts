/**
 * lib/org/organizations.ts — org-creation business logic (multi-tenant UX).
 * Node-only. Route handlers stay thin (§3) and call these; the flag check lives
 * at the route boundary.
 */

import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { ORG_ROLES, type Organization } from "@/lib/db/schema";
import type { AuthUser } from "@/lib/auth/types";

/** Turn a display name into a URL-safe slug fragment. */
function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "org"
  );
}

/**
 * Create an organization and make `user` its first admin. `slug` gets a short
 * random suffix so it's unique without a lookup round-trip (the `slug` column is
 * uniquely constrained in both adapters).
 */
export async function createOrganizationForUser(
  user: AuthUser,
  name: string,
): Promise<Organization> {
  const slug = `${slugify(name)}-${randomUUID().slice(0, 6)}`;
  const org = await db.createOrganization({ name: name.trim(), slug });
  await db.addMember({
    organizationId: org.id,
    userId: user.id,
    role: ORG_ROLES.admin,
  });
  return org;
}
