/**
 * scripts/seed.ts — CORE (CLAUDE.md §2). Provider-aware baseline seed.
 *
 * Uses `db` from @/lib/db, so it seeds whichever provider `DB_PROVIDER` selects
 * — no provider-specific code here. Creates one test organization, one admin
 * user, and one regular user, and wires their memberships.
 *
 * Per the "new table = three things" rule (§1.4), every model added in a later
 * phase adds its seed entry here in the same commit as its schema and adapter
 * method.
 *
 * Run with `pnpm seed` (or `npm run seed`). Users are looked up by email so the
 * user rows are idempotent; the organization is created fresh, so run this
 * against an empty database (or use the test-DB reset flow, deferred to
 * seed-test.ts). Requires a valid DB_PROVIDER + connection env (see .env.example).
 */

import { env } from "@/config/env.schema";
import { db, ORG_ROLES, type User } from "@/lib/db";

async function ensureUser(email: string, name: string): Promise<User> {
  const existing = await db.getUserByEmail(email);
  if (existing) return existing;
  return db.createUser({ email, name });
}

async function main(): Promise<void> {
  console.log(`Seeding via the "${env.DB_PROVIDER}" adapter…`);

  const org = await db.createOrganization({
    name: "Test Organization",
    slug: "test-org",
  });

  const admin = await ensureUser("admin@example.com", "Admin User");
  const member = await ensureUser("user@example.com", "Regular User");

  await db.addMember({
    organizationId: org.id,
    userId: admin.id,
    role: ORG_ROLES.admin,
  });
  await db.addMember({
    organizationId: org.id,
    userId: member.id,
    role: ORG_ROLES.user,
  });

  console.log("Seed complete:");
  console.log(`  organization  ${org.id} (${org.slug})`);
  console.log(`  admin user    ${admin.id} (${admin.email})`);
  console.log(`  regular user  ${member.id} (${member.email})`);

  await db.disconnect?.();
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
