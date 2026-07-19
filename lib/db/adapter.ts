/**
 * lib/db/adapter.ts — the DatabaseAdapter interface. CORE (CLAUDE.md §2).
 *
 * This is the ONE interface all application code imports (via `@/lib/db`). It
 * never leaks a provider detail. Concrete implementations live in ./supabase
 * and ./mongodb; the provider is selected once in ./index.ts — the only file
 * allowed to branch on `DB_PROVIDER` (§1.2).
 *
 * Kept intentionally minimal — user CRUD, organization CRUD, and org-membership
 * CRUD. Later phases extend it per-feature (each new table adds its methods here
 * alongside a Zod schema and a seed entry, in the same commit — §1.4).
 *
 * Tenant scoping (§1.3): membership methods take `organizationId` as their first
 * argument so every tenant-scoped read/write is explicitly org-bound.
 */

import type {
  Invitation,
  InvitationStatus,
  NewInvitation,
  NewOrganization,
  NewOrganizationMember,
  NewUser,
  Organization,
  OrganizationMember,
  OrgRole,
  UpdateOrganization,
  UpdateUser,
  User,
} from "./schema";

export interface DatabaseAdapter {
  /* -- Users (global identities) ------------------------------------------ */
  createUser(input: NewUser): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  updateUser(id: string, patch: UpdateUser): Promise<User>;
  deleteUser(id: string): Promise<void>;

  /* -- Organizations (tenant boundary) ------------------------------------ */
  createOrganization(input: NewOrganization): Promise<Organization>;
  getOrganizationById(id: string): Promise<Organization | null>;
  updateOrganization(
    id: string,
    patch: UpdateOrganization,
  ): Promise<Organization>;
  deleteOrganization(id: string): Promise<void>;

  /* -- Organization membership (tenant-scoped by organizationId) ---------- */
  addMember(input: NewOrganizationMember): Promise<OrganizationMember>;
  getMembership(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMember | null>;
  listMembers(organizationId: string): Promise<OrganizationMember[]>;
  /** All memberships for a user across orgs — used to resolve org context. */
  listMembershipsForUser(userId: string): Promise<OrganizationMember[]>;
  updateMemberRole(
    organizationId: string,
    userId: string,
    role: OrgRole,
  ): Promise<OrganizationMember>;
  removeMember(organizationId: string, userId: string): Promise<void>;

  /* -- Invitations (tenant-scoped by organizationId) ---------------------- */
  createInvitation(input: NewInvitation): Promise<Invitation>;
  getInvitationByToken(token: string): Promise<Invitation | null>;
  listInvitations(organizationId: string): Promise<Invitation[]>;
  updateInvitationStatus(
    id: string,
    status: InvitationStatus,
  ): Promise<Invitation>;
  /** A still-pending invite for this email in this org, if any (dedupe check). */
  getPendingInvitationForEmail(
    organizationId: string,
    email: string,
  ): Promise<Invitation | null>;

  /* -- Lifecycle ---------------------------------------------------------- */
  /** Close underlying connections (used by scripts like seed). Optional. */
  disconnect?(): Promise<void>;
}
