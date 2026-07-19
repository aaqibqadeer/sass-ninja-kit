/**
 * scripts/seed.ts — CORE (CLAUDE.md §2). Provider-aware baseline seed.
 *
 * Seeds whichever provider `DB_PROVIDER` selects. Creates two users WITH valid
 * auth credentials (via the auth adapter, so email/password sign-in works
 * locally), one test organization, and their memberships (admin + user).
 *
 * Per the "new table = three things" rule (§1.4), every model added in a later
 * phase adds its seed entry here in the same commit as its schema and adapter
 * method.
 *
 * Run with `pnpm seed` (or `npm run seed`). Idempotent on users (looked up by
 * email); the organization is created fresh, so run against an empty database.
 * Requires valid DB + AUTH env (see .env.example).
 */

import { env } from "@/config/env.schema";
import { auth } from "@/lib/auth";
import { db, ORG_ROLES } from "@/lib/db";

/** Shared password for the seeded users — local testing only. */
const SEED_PASSWORD = "Password123!";

async function ensureUser(
  email: string,
  name: string,
): Promise<{ id: string; email: string }> {
  const existing = await db.getUserByEmail(email);
  if (existing) return existing;
  const { user } = await auth.createCredentials({
    email,
    password: SEED_PASSWORD,
    name,
  });
  return user;
}

async function main(): Promise<void> {
  console.log(`Seeding via the "${env.DB_PROVIDER}" adapter…`);

  const admin = await ensureUser("admin@example.com", "Admin User");
  const member = await ensureUser("user@example.com", "Regular User");

  const org = await db.createOrganization({
    name: "Test Organization",
    slug: "test-org",
  });

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
  console.log(`  password for both: ${SEED_PASSWORD}`);

  await db.disconnect?.();
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
