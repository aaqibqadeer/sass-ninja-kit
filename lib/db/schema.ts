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

export const updateUserSchema = newUserSchema.partial();
export type UpdateUser = z.infer<typeof updateUserSchema>;

/* -------------------------------------------------------------------------- */
/* Organization (tenant boundary)                                             */
/* -------------------------------------------------------------------------- */

export const organizationSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  slug: z.string().min(1),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Organization = z.infer<typeof organizationSchema>;

export const newOrganizationSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
});
export type NewOrganization = z.infer<typeof newOrganizationSchema>;

export const updateOrganizationSchema = newOrganizationSchema.partial();
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
