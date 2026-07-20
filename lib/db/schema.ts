/**
 * lib/db/schema.ts — canonical, provider-agnostic domain models (CLAUDE.md §1.4).
 *
 * These Zod schemas are the single source of truth for the shape of core
 * entities. Both adapters (Supabase, MongoDB) map their storage rows/documents
 * to and from these types, so app code sees one consistent shape regardless of
 * provider.
 *
 * Multi-tenant rule (§1.3): `organizations` is the tenant boundary and every
 * tenant-scoped table carries `organization_id`. Here, `organization_members`
 * is tenant-scoped. `users` are global identities that join orgs via membership.
 *
 * IDs are strings (Supabase uuid / Mongo ObjectId hex). Timestamps are `Date`
 * (`z.coerce.date()` parses Supabase ISO strings and Mongo `Date`s alike).
 */

import { z } from "zod";

/**
 * Built-in membership roles. `role` is stored as an extensible free string so a
 * fork can add its own roles; `admin` and `user` are the built-ins.
 */
export const ORG_ROLES = {
  admin: "admin",
  user: "user",
} as const;
export type BuiltInRole = (typeof ORG_ROLES)[keyof typeof ORG_ROLES];

export const roleSchema = z.string().min(1);
export type OrgRole = z.infer<typeof roleSchema>;

/* -------------------------------------------------------------------------- */
/* User (global identity)                                                     */
/* -------------------------------------------------------------------------- */

export const userSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string().nullable().optional(),
  /**
   * Platform-level super-admin flag (CLAUDE.md §14). This lives on the user
   * record itself — NOT in `organization_members` — because pricing/billing are
   * platform concerns, independent of any org membership or org role. Never gate
   * it behind `multiTenant`.
   */
  isSuperAdmin: z.boolean().default(false),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type User = z.infer<typeof userSchema>;

export const newUserSchema = z.object({
  /**
   * Optional explicit id. Used by the Supabase auth adapter to make the profile
   * row's id match the Supabase auth user's UID. Omitted for Mongo (the adapter
   * generates an ObjectId).
   */
  id: z.string().optional(),
  email: z.email(),
  name: z.string().nullable().optional(),
});
export type NewUser = z.infer<typeof newUserSchema>;

/**
 * Users are never *created* as super-admin (not in `newUserSchema`), but can be
 * promoted afterwards — e.g. the seed script promoting `SUPER_ADMIN_EMAIL`.
 */
export const updateUserSchema = newUserSchema.partial().extend({
  isSuperAdmin: z.boolean().optional(),
});
export type UpdateUser = z.infer<typeof updateUserSchema>;

/* -------------------------------------------------------------------------- */
/* Organization (tenant boundary)                                             */
/* -------------------------------------------------------------------------- */

export const organizationSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  slug: z.string().min(1),
  /**
   * Billing linkage (Phase 5). The org is the billing entity — subscriptions are
   * org-scoped and `stripeCustomerId` ties this org to its Stripe customer.
   * `trialEndsAt` is computed at org creation from `app_settings.trialDays`.
   * Both are null until payments is configured/used.
   */
  stripeCustomerId: z.string().nullable().optional(),
  trialEndsAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Organization = z.infer<typeof organizationSchema>;

export const newOrganizationSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  /** Set at creation from `app_settings.trialDays` (null when payments is off). */
  trialEndsAt: z.coerce.date().nullable().optional(),
});
export type NewOrganization = z.infer<typeof newOrganizationSchema>;

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  stripeCustomerId: z.string().nullable().optional(),
  trialEndsAt: z.coerce.date().nullable().optional(),
});
export type UpdateOrganization = z.infer<typeof updateOrganizationSchema>;

/* -------------------------------------------------------------------------- */
/* OrganizationMember (tenant-scoped: carries organization_id)                */
/* -------------------------------------------------------------------------- */

export const organizationMemberSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  role: roleSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type OrganizationMember = z.infer<typeof organizationMemberSchema>;

export const newOrganizationMemberSchema = z.object({
  organizationId: z.string(),
  userId: z.string(),
  role: roleSchema.default(ORG_ROLES.user),
});
export type NewOrganizationMember = z.infer<typeof newOrganizationMemberSchema>;

/* -------------------------------------------------------------------------- */
/* Invitation (tenant-scoped: carries organization_id)                        */
/* -------------------------------------------------------------------------- */

/**
 * Email-based org invitations (multi-tenant UX). An invite is created `pending`
 * with a random token; accepting it turns the invitee into a member. Tokens are
 * single-use — status moves to `accepted` (used) or `revoked` (withdrawn).
 */
export const INVITATION_STATUSES = {
  pending: "pending",
  accepted: "accepted",
  revoked: "revoked",
} as const;
export type InvitationStatus =
  (typeof INVITATION_STATUSES)[keyof typeof INVITATION_STATUSES];
export const invitationStatusSchema = z.enum([
  INVITATION_STATUSES.pending,
  INVITATION_STATUSES.accepted,
  INVITATION_STATUSES.revoked,
]);

export const invitationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  email: z.email(),
  role: roleSchema,
  token: z.string(),
  status: invitationStatusSchema,
  invitedByUserId: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Invitation = z.infer<typeof invitationSchema>;

/**
 * `token`, `expiresAt`, and the initial `status` are generated by the business
 * layer (`lib/org/invitations.ts`), not the caller.
 */
export const newInvitationSchema = z.object({
  organizationId: z.string(),
  email: z.email(),
  role: roleSchema.default(ORG_ROLES.user),
  token: z.string(),
  status: invitationStatusSchema.default(INVITATION_STATUSES.pending),
  invitedByUserId: z.string(),
  expiresAt: z.coerce.date(),
});
export type NewInvitation = z.infer<typeof newInvitationSchema>;

/* -------------------------------------------------------------------------- */
/* Plan (PLATFORM-LEVEL — the one intentional non-tenant table, §15/§1.3)     */
/* -------------------------------------------------------------------------- */

/**
 * Pricing plans belong to the PLATFORM, not to any tenant — so `plans` has NO
 * `organization_id`. This is the sole, deliberate exception to the
 * multi-tenant-by-default rule (§1.3), called out in CLAUDE.md §15.
 *
 * Monetary amounts are integer MINOR units (cents), matching Stripe's
 * `unit_amount`. `priceAnnual`/`annualDiscountPercent` are only meaningful when
 * `features.payments.annualBilling` is on; they stay null otherwise (no schema
 * change to toggle — §15). `limits` is the JSON entitlements blob read by
 * `hasAccess()`. The `stripe*` ids are managed by the payments adapter; because
 * Stripe Prices are immutable, a price change creates a NEW Price and relinks
 * these ids (never mutates one in place — §15).
 */
export const planSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  priceMonthly: z.number().int().nonnegative(),
  priceAnnual: z.number().int().nonnegative().nullable().optional(),
  annualDiscountPercent: z.number().min(0).max(100).nullable().optional(),
  /** Entitlements/quotas JSON, read by `hasAccess()` (§15). */
  limits: z.record(z.string(), z.unknown()).default({}),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  stripeProductId: z.string().nullable().optional(),
  stripePriceIdMonthly: z.string().nullable().optional(),
  stripePriceIdAnnual: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Plan = z.infer<typeof planSchema>;

export const newPlanSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  priceMonthly: z.number().int().nonnegative(),
  priceAnnual: z.number().int().nonnegative().nullable().optional(),
  annualDiscountPercent: z.number().min(0).max(100).nullable().optional(),
  limits: z.record(z.string(), z.unknown()).default({}),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  stripeProductId: z.string().nullable().optional(),
  stripePriceIdMonthly: z.string().nullable().optional(),
  stripePriceIdAnnual: z.string().nullable().optional(),
});
export type NewPlan = z.infer<typeof newPlanSchema>;

export const updatePlanSchema = newPlanSchema.partial();
export type UpdatePlan = z.infer<typeof updatePlanSchema>;

/* -------------------------------------------------------------------------- */
/* AppSettings (PLATFORM-LEVEL singleton — admin-editable platform config)     */
/* -------------------------------------------------------------------------- */

/**
 * Platform-wide, admin-editable settings — a single row. Currently just
 * `trialDays` (used to compute an org's `trialEndsAt` at creation). No
 * `organization_id`: like `plans`, this is a platform concern, not per-tenant.
 */
export const DEFAULT_TRIAL_DAYS = 14;

export const appSettingsSchema = z.object({
  id: z.string(),
  trialDays: z.number().int().nonnegative().default(DEFAULT_TRIAL_DAYS),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type AppSettings = z.infer<typeof appSettingsSchema>;

export const updateAppSettingsSchema = z.object({
  trialDays: z.number().int().nonnegative().optional(),
});
export type UpdateAppSettings = z.infer<typeof updateAppSettingsSchema>;

/* -------------------------------------------------------------------------- */
/* Subscription (tenant-scoped: carries organization_id)                      */
/* -------------------------------------------------------------------------- */

/**
 * An org's billing subscription. Org-scoped (the org is the billing entity).
 * `status` mirrors the payment provider's subscription state and is kept in sync
 * by the Stripe webhook handler. `planId` links to a platform `plans` row.
 */
export const SUBSCRIPTION_STATUSES = {
  trialing: "trialing",
  active: "active",
  past_due: "past_due",
  canceled: "canceled",
  incomplete: "incomplete",
} as const;
export type SubscriptionStatus =
  (typeof SUBSCRIPTION_STATUSES)[keyof typeof SUBSCRIPTION_STATUSES];
export const subscriptionStatusSchema = z.enum([
  SUBSCRIPTION_STATUSES.trialing,
  SUBSCRIPTION_STATUSES.active,
  SUBSCRIPTION_STATUSES.past_due,
  SUBSCRIPTION_STATUSES.canceled,
  SUBSCRIPTION_STATUSES.incomplete,
]);

export const subscriptionSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  planId: z.string(),
  status: subscriptionStatusSchema,
  stripeCustomerId: z.string().nullable().optional(),
  stripeSubscriptionId: z.string().nullable().optional(),
  currentPeriodEnd: z.coerce.date().nullable().optional(),
  cancelAtPeriodEnd: z.boolean().default(false),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Subscription = z.infer<typeof subscriptionSchema>;

export const newSubscriptionSchema = z.object({
  organizationId: z.string(),
  planId: z.string(),
  status: subscriptionStatusSchema.default(SUBSCRIPTION_STATUSES.trialing),
  stripeCustomerId: z.string().nullable().optional(),
  stripeSubscriptionId: z.string().nullable().optional(),
  currentPeriodEnd: z.coerce.date().nullable().optional(),
  cancelAtPeriodEnd: z.boolean().default(false),
});
export type NewSubscription = z.infer<typeof newSubscriptionSchema>;

export const updateSubscriptionSchema = z.object({
  planId: z.string().optional(),
  status: subscriptionStatusSchema.optional(),
  stripeCustomerId: z.string().nullable().optional(),
  stripeSubscriptionId: z.string().nullable().optional(),
  currentPeriodEnd: z.coerce.date().nullable().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
});
export type UpdateSubscription = z.infer<typeof updateSubscriptionSchema>;
