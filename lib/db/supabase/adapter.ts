/**
 * lib/db/supabase/adapter.ts — Supabase implementation of DatabaseAdapter.
 *
 * Uses the Supabase JS client. Queries are RLS-aware: tenant-scoped reads/writes
 * always filter by `organization_id`, so with the appropriate row-level-security
 * policies in place a client can only ever touch its own org's rows. This
 * server-side adapter is constructed with the service-role key (used by scripts
 * like seed and trusted server code); per-request, user-scoped clients that let
 * RLS do the enforcement are layered in with auth in a later phase.
 *
 * Storage columns are snake_case; every method maps rows to/from the canonical
 * camelCase domain models in ../schema.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/config/env.schema";
import type { DatabaseAdapter } from "../adapter";
import type {
  NewOrganization,
  NewOrganizationMember,
  NewUser,
  Organization,
  OrganizationMember,
  OrgRole,
  UpdateOrganization,
  UpdateUser,
  User,
} from "../schema";
import { newOrganizationMemberSchema } from "../schema";

/* -- Storage row shapes (snake_case) --------------------------------------- */

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

interface OrganizationMemberRow {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  created_at: string;
  updated_at: string;
}

const TABLES = {
  users: "users",
  organizations: "organizations",
  members: "organization_members",
} as const;

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function toOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function toMember(row: OrganizationMemberRow): OrganizationMember {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    role: row.role,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`SupabaseAdapter: ${name} is not configured`);
  }
  return value;
}

export class SupabaseAdapter implements DatabaseAdapter {
  private readonly client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client =
      client ??
      createClient(
        required("SUPABASE_URL", env.SUPABASE_URL),
        required("SUPABASE_SERVICE_ROLE_KEY", env.SUPABASE_SERVICE_ROLE_KEY),
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
  }

  /* -- Users -------------------------------------------------------------- */

  async createUser(input: NewUser): Promise<User> {
    const row: Record<string, unknown> = {
      email: input.email,
      name: input.name ?? null,
    };
    if (input.id) row.id = input.id;
    const { data, error } = await this.client
      .from(TABLES.users)
      .insert(row)
      .select()
      .single();
    if (error) throw new Error(`supabase createUser: ${error.message}`);
    return toUser(data as UserRow);
  }

  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await this.client
      .from(TABLES.users)
      .select()
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`supabase getUserById: ${error.message}`);
    return data ? toUser(data as UserRow) : null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.client
      .from(TABLES.users)
      .select()
      .eq("email", email)
      .maybeSingle();
    if (error) throw new Error(`supabase getUserByEmail: ${error.message}`);
    return data ? toUser(data as UserRow) : null;
  }

  async updateUser(id: string, patch: UpdateUser): Promise<User> {
    const { data, error } = await this.client
      .from(TABLES.users)
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(`supabase updateUser: ${error.message}`);
    return toUser(data as UserRow);
  }

  async deleteUser(id: string): Promise<void> {
    const { error } = await this.client
      .from(TABLES.users)
      .delete()
      .eq("id", id);
    if (error) throw new Error(`supabase deleteUser: ${error.message}`);
  }

  /* -- Organizations ------------------------------------------------------ */

  async createOrganization(input: NewOrganization): Promise<Organization> {
    const { data, error } = await this.client
      .from(TABLES.organizations)
      .insert({ name: input.name, slug: input.slug })
      .select()
      .single();
    if (error) throw new Error(`supabase createOrganization: ${error.message}`);
    return toOrganization(data as OrganizationRow);
  }

  async getOrganizationById(id: string): Promise<Organization | null> {
    const { data, error } = await this.client
      .from(TABLES.organizations)
      .select()
      .eq("id", id)
      .maybeSingle();
    if (error)
      throw new Error(`supabase getOrganizationById: ${error.message}`);
    return data ? toOrganization(data as OrganizationRow) : null;
  }

  async updateOrganization(
    id: string,
    patch: UpdateOrganization,
  ): Promise<Organization> {
    const { data, error } = await this.client
      .from(TABLES.organizations)
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(`supabase updateOrganization: ${error.message}`);
    return toOrganization(data as OrganizationRow);
  }

  async deleteOrganization(id: string): Promise<void> {
    const { error } = await this.client
      .from(TABLES.organizations)
      .delete()
      .eq("id", id);
    if (error) throw new Error(`supabase deleteOrganization: ${error.message}`);
  }

  /* -- Membership (scoped by organization_id) ----------------------------- */

  async addMember(input: NewOrganizationMember): Promise<OrganizationMember> {
    const parsed = newOrganizationMemberSchema.parse(input);
    const { data, error } = await this.client
      .from(TABLES.members)
      .insert({
        organization_id: parsed.organizationId,
        user_id: parsed.userId,
        role: parsed.role,
      })
      .select()
      .single();
    if (error) throw new Error(`supabase addMember: ${error.message}`);
    return toMember(data as OrganizationMemberRow);
  }

  async getMembership(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMember | null> {
    const { data, error } = await this.client
      .from(TABLES.members)
      .select()
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(`supabase getMembership: ${error.message}`);
    return data ? toMember(data as OrganizationMemberRow) : null;
  }

  async listMembers(organizationId: string): Promise<OrganizationMember[]> {
    const { data, error } = await this.client
      .from(TABLES.members)
      .select()
      .eq("organization_id", organizationId);
    if (error) throw new Error(`supabase listMembers: ${error.message}`);
    return (data as OrganizationMemberRow[]).map(toMember);
  }

  async listMembershipsForUser(userId: string): Promise<OrganizationMember[]> {
    const { data, error } = await this.client
      .from(TABLES.members)
      .select()
      .eq("user_id", userId);
    if (error)
      throw new Error(`supabase listMembershipsForUser: ${error.message}`);
    return (data as OrganizationMemberRow[]).map(toMember);
  }

  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: OrgRole,
  ): Promise<OrganizationMember> {
    const { data, error } = await this.client
      .from(TABLES.members)
      .update({ role, updated_at: new Date().toISOString() })
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw new Error(`supabase updateMemberRole: ${error.message}`);
    return toMember(data as OrganizationMemberRow);
  }

  async removeMember(organizationId: string, userId: string): Promise<void> {
    const { error } = await this.client
      .from(TABLES.members)
      .delete()
      .eq("organization_id", organizationId)
      .eq("user_id", userId);
    if (error) throw new Error(`supabase removeMember: ${error.message}`);
  }
}
