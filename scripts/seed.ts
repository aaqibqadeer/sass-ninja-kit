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

import { randomUUID } from "node:crypto";

import { env } from "@/config/env.schema";
import { auth } from "@/lib/auth";
import { db, INVITATION_STATUSES, ORG_ROLES } from "@/lib/db";

/** Shared password for the seeded users — local testing only. */
const SEED_PASSWORD = "Password123!";

/** How long seeded invitations stay valid. */
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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

  // Promote the platform super-admin (§14) — from SUPER_ADMIN_EMAIL, or the
  // seeded admin as a sensible local default. Never hardcoded in app code.
  const superAdminEmail = env.SUPER_ADMIN_EMAIL ?? admin.email;
  const superAdminUser = await db.getUserByEmail(superAdminEmail);
  if (superAdminUser) {
    await db.updateUser(superAdminUser.id, { isSuperAdmin: true });
  }

  // A pending invitation so the members UI has data to render.
  const invite = await db.createInvitation({
    organizationId: org.id,
    email: "invitee@example.com",
    role: ORG_ROLES.user,
    token: `seed-invite-${randomUUID()}`,
    status: INVITATION_STATUSES.pending,
    invitedByUserId: admin.id,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });

  // Platform pricing plans (§15). Placeholders only — count and names are just
  // data (super admin edits them in the admin panel); nothing in app logic
  // hardcodes them. Prices are integer minor units (cents). Seeded only when no
  // plans exist yet, so re-runs don't duplicate them.
  const existingPlans = await db.listPlans();
  if (existingPlans.length === 0) {
    await db.createPlan({
      name: "Starter",
      description: "For trying things out.",
      priceMonthly: 0,
      priceAnnual: 0,
      annualDiscountPercent: null,
      limits: { seats: 1, projects: 1, apiAccess: false },
      isActive: true,
      sortOrder: 0,
    });
    await db.createPlan({
      name: "Pro",
      description: "For growing teams.",
      priceMonthly: 2900,
      priceAnnual: 29000,
      annualDiscountPercent: 17,
      limits: { seats: 5, projects: 10, apiAccess: true },
      isActive: true,
      sortOrder: 1,
    });
    await db.createPlan({
      name: "Enterprise",
      description: "For organizations at scale.",
      priceMonthly: 9900,
      priceAnnual: 99000,
      annualDiscountPercent: 17,
      limits: { seats: -1, projects: -1, apiAccess: true, sso: true },
      isActive: true,
      sortOrder: 2,
    });
  }

  // Ensure the platform settings singleton exists (default trialDays).
  const settings = await db.getAppSettings();

  console.log("Seed complete:");
  console.log(`  organization  ${org.id} (${org.slug})`);
  console.log(`  admin user    ${admin.id} (${admin.email})`);
  console.log(`  regular user  ${member.id} (${member.email})`);
  console.log(
    `  super admin   ${
      superAdminUser
        ? superAdminEmail +
          (env.SUPER_ADMIN_EMAIL
            ? ""
            : " (default; set SUPER_ADMIN_EMAIL to override)")
        : `not promoted — ${superAdminEmail} not found`
    }`,
  );
  console.log(
    `  invitation    ${invite.email} → ${invite.status} (${org.slug})`,
  );
  const plans = await db.listPlans();
  console.log(
    `  plans         ${plans.map((p) => p.name).join(", ") || "none"}`,
  );
  console.log(`  app settings  trialDays=${settings.trialDays}`);
  console.log(`  password for both: ${SEED_PASSWORD}`);

  await db.disconnect?.();
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
