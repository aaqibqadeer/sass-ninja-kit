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
  AppSettings,
  Invitation,
  InvitationStatus,
  NewInvitation,
  NewOrganization,
  NewOrganizationMember,
  NewPlan,
  NewSubscription,
  NewUser,
  Organization,
  OrganizationMember,
  OrgRole,
  Plan,
  Subscription,
  UpdateAppSettings,
  UpdateOrganization,
  UpdatePlan,
  UpdateSubscription,
  UpdateUser,
  User,
} from "../schema";
import {
  DEFAULT_TRIAL_DAYS,
  newInvitationSchema,
  newOrganizationMemberSchema,
  newPlanSchema,
  newSubscriptionSchema,
} from "../schema";

/* -- Storage row shapes (snake_case) --------------------------------------- */

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  is_super_admin: boolean | null;
  created_at: string;
  updated_at: string;
}

interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  stripe_customer_id: string | null;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PlanRow {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_annual: number | null;
  annual_discount_percent: number | null;
  limits: Record<string, unknown> | null;
  is_active: boolean;
  sort_order: number;
  stripe_product_id: string | null;
  stripe_price_id_monthly: string | null;
  stripe_price_id_annual: string | null;
  created_at: string;
  updated_at: string;
}

interface AppSettingsRow {
  id: string;
  trial_days: number;
  created_at: string;
  updated_at: string;
}

interface SubscriptionRow {
  id: string;
  organization_id: string;
  plan_id: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
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

interface InvitationRow {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  token: string;
  status: string;
  invited_by_user_id: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

const TABLES = {
  users: "users",
  organizations: "organizations",
  members: "organization_members",
  invitations: "organization_invitations",
  plans: "plans",
  appSettings: "app_settings",
  subscriptions: "subscriptions",
} as const;

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    isSuperAdmin: row.is_super_admin ?? false,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function toOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    stripeCustomerId: row.stripe_customer_id,
    trialEndsAt: row.trial_ends_at ? new Date(row.trial_ends_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function toPlan(row: PlanRow): Plan {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceMonthly: row.price_monthly,
    priceAnnual: row.price_annual,
    annualDiscountPercent: row.annual_discount_percent,
    limits: row.limits ?? {},
    isActive: row.is_active,
    sortOrder: row.sort_order,
    stripeProductId: row.stripe_product_id,
    stripePriceIdMonthly: row.stripe_price_id_monthly,
    stripePriceIdAnnual: row.stripe_price_id_annual,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function toAppSettings(row: AppSettingsRow): AppSettings {
  return {
    id: row.id,
    trialDays: row.trial_days,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function toSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    organizationId: row.organization_id,
    planId: row.plan_id,
    status: row.status as Subscription["status"],
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    currentPeriodEnd: row.current_period_end
      ? new Date(row.current_period_end)
      : null,
    cancelAtPeriodEnd: row.cancel_at_period_end,
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

function toInvitation(row: InvitationRow): Invitation {
  return {
    id: row.id,
    organizationId: row.organization_id,
    email: row.email,
    role: row.role,
    token: row.token,
    status: row.status as Invitation["status"],
    invitedByUserId: row.invited_by_user_id,
    expiresAt: new Date(row.expires_at),
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
    // Map camelCase domain fields to snake_case columns.
    const row: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (patch.email !== undefined) row.email = patch.email;
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.isSuperAdmin !== undefined)
      row.is_super_admin = patch.isSuperAdmin;
    const { data, error } = await this.client
      .from(TABLES.users)
      .update(row)
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
    const row: Record<string, unknown> = {
      name: input.name,
      slug: input.slug,
    };
    if (input.trialEndsAt !== undefined) {
      row.trial_ends_at = input.trialEndsAt
        ? input.trialEndsAt.toISOString()
        : null;
    }
    const { data, error } = await this.client
      .from(TABLES.organizations)
      .insert(row)
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
    const row: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.slug !== undefined) row.slug = patch.slug;
    if (patch.stripeCustomerId !== undefined)
      row.stripe_customer_id = patch.stripeCustomerId;
    if (patch.trialEndsAt !== undefined)
      row.trial_ends_at = patch.trialEndsAt
        ? patch.trialEndsAt.toISOString()
        : null;
    const { data, error } = await this.client
      .from(TABLES.organizations)
      .update(row)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(`supabase updateOrganization: ${error.message}`);
    return toOrganization(data as OrganizationRow);
  }

  async getOrganizationByStripeCustomerId(
    stripeCustomerId: string,
  ): Promise<Organization | null> {
    const { data, error } = await this.client
      .from(TABLES.organizations)
      .select()
      .eq("stripe_customer_id", stripeCustomerId)
      .maybeSingle();
    if (error)
      throw new Error(
        `supabase getOrganizationByStripeCustomerId: ${error.message}`,
      );
    return data ? toOrganization(data as OrganizationRow) : null;
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

  /* -- Invitations (scoped by organization_id) ---------------------------- */

  async createInvitation(input: NewInvitation): Promise<Invitation> {
    const parsed = newInvitationSchema.parse(input);
    const { data, error } = await this.client
      .from(TABLES.invitations)
      .insert({
        organization_id: parsed.organizationId,
        email: parsed.email,
        role: parsed.role,
        token: parsed.token,
        status: parsed.status,
        invited_by_user_id: parsed.invitedByUserId,
        expires_at: parsed.expiresAt.toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(`supabase createInvitation: ${error.message}`);
    return toInvitation(data as InvitationRow);
  }

  async getInvitationByToken(token: string): Promise<Invitation | null> {
    const { data, error } = await this.client
      .from(TABLES.invitations)
      .select()
      .eq("token", token)
      .maybeSingle();
    if (error)
      throw new Error(`supabase getInvitationByToken: ${error.message}`);
    return data ? toInvitation(data as InvitationRow) : null;
  }

  async listInvitations(organizationId: string): Promise<Invitation[]> {
    const { data, error } = await this.client
      .from(TABLES.invitations)
      .select()
      .eq("organization_id", organizationId);
    if (error) throw new Error(`supabase listInvitations: ${error.message}`);
    return (data as InvitationRow[]).map(toInvitation);
  }

  async updateInvitationStatus(
    id: string,
    status: InvitationStatus,
  ): Promise<Invitation> {
    const { data, error } = await this.client
      .from(TABLES.invitations)
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error)
      throw new Error(`supabase updateInvitationStatus: ${error.message}`);
    return toInvitation(data as InvitationRow);
  }

  async getPendingInvitationForEmail(
    organizationId: string,
    email: string,
  ): Promise<Invitation | null> {
    const { data, error } = await this.client
      .from(TABLES.invitations)
      .select()
      .eq("organization_id", organizationId)
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();
    if (error)
      throw new Error(
        `supabase getPendingInvitationForEmail: ${error.message}`,
      );
    return data ? toInvitation(data as InvitationRow) : null;
  }

  /* -- Plans (platform-level, no organization_id — §15) ------------------- */

  async createPlan(input: NewPlan): Promise<Plan> {
    const parsed = newPlanSchema.parse(input);
    const { data, error } = await this.client
      .from(TABLES.plans)
      .insert({
        name: parsed.name,
        description: parsed.description ?? null,
        price_monthly: parsed.priceMonthly,
        price_annual: parsed.priceAnnual ?? null,
        annual_discount_percent: parsed.annualDiscountPercent ?? null,
        limits: parsed.limits,
        is_active: parsed.isActive,
        sort_order: parsed.sortOrder,
        stripe_product_id: parsed.stripeProductId ?? null,
        stripe_price_id_monthly: parsed.stripePriceIdMonthly ?? null,
        stripe_price_id_annual: parsed.stripePriceIdAnnual ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(`supabase createPlan: ${error.message}`);
    return toPlan(data as PlanRow);
  }

  async getPlanById(id: string): Promise<Plan | null> {
    const { data, error } = await this.client
      .from(TABLES.plans)
      .select()
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`supabase getPlanById: ${error.message}`);
    return data ? toPlan(data as PlanRow) : null;
  }

  async listPlans(): Promise<Plan[]> {
    const { data, error } = await this.client
      .from(TABLES.plans)
      .select()
      .order("sort_order", { ascending: true });
    if (error) throw new Error(`supabase listPlans: ${error.message}`);
    return (data as PlanRow[]).map(toPlan);
  }

  async listActivePlans(): Promise<Plan[]> {
    const { data, error } = await this.client
      .from(TABLES.plans)
      .select()
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(`supabase listActivePlans: ${error.message}`);
    return (data as PlanRow[]).map(toPlan);
  }

  async updatePlan(id: string, patch: UpdatePlan): Promise<Plan> {
    const row: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.description !== undefined) row.description = patch.description;
    if (patch.priceMonthly !== undefined)
      row.price_monthly = patch.priceMonthly;
    if (patch.priceAnnual !== undefined) row.price_annual = patch.priceAnnual;
    if (patch.annualDiscountPercent !== undefined)
      row.annual_discount_percent = patch.annualDiscountPercent;
    if (patch.limits !== undefined) row.limits = patch.limits;
    if (patch.isActive !== undefined) row.is_active = patch.isActive;
    if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
    if (patch.stripeProductId !== undefined)
      row.stripe_product_id = patch.stripeProductId;
    if (patch.stripePriceIdMonthly !== undefined)
      row.stripe_price_id_monthly = patch.stripePriceIdMonthly;
    if (patch.stripePriceIdAnnual !== undefined)
      row.stripe_price_id_annual = patch.stripePriceIdAnnual;
    const { data, error } = await this.client
      .from(TABLES.plans)
      .update(row)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(`supabase updatePlan: ${error.message}`);
    return toPlan(data as PlanRow);
  }

  async deletePlan(id: string): Promise<void> {
    const { error } = await this.client
      .from(TABLES.plans)
      .delete()
      .eq("id", id);
    if (error) throw new Error(`supabase deletePlan: ${error.message}`);
  }

  /* -- App settings (platform-level singleton) ---------------------------- */

  async getAppSettings(): Promise<AppSettings> {
    const { data, error } = await this.client
      .from(TABLES.appSettings)
      .select()
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`supabase getAppSettings: ${error.message}`);
    if (data) return toAppSettings(data as AppSettingsRow);

    // Create the singleton row with defaults on first access.
    const { data: created, error: insertError } = await this.client
      .from(TABLES.appSettings)
      .insert({ trial_days: DEFAULT_TRIAL_DAYS })
      .select()
      .single();
    if (insertError)
      throw new Error(`supabase getAppSettings (init): ${insertError.message}`);
    return toAppSettings(created as AppSettingsRow);
  }

  async updateAppSettings(patch: UpdateAppSettings): Promise<AppSettings> {
    const current = await this.getAppSettings();
    const row: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (patch.trialDays !== undefined) row.trial_days = patch.trialDays;
    const { data, error } = await this.client
      .from(TABLES.appSettings)
      .update(row)
      .eq("id", current.id)
      .select()
      .single();
    if (error) throw new Error(`supabase updateAppSettings: ${error.message}`);
    return toAppSettings(data as AppSettingsRow);
  }

  /* -- Subscriptions (scoped by organization_id) -------------------------- */

  async createSubscription(input: NewSubscription): Promise<Subscription> {
    const parsed = newSubscriptionSchema.parse(input);
    const { data, error } = await this.client
      .from(TABLES.subscriptions)
      .insert({
        organization_id: parsed.organizationId,
        plan_id: parsed.planId,
        status: parsed.status,
        stripe_customer_id: parsed.stripeCustomerId ?? null,
        stripe_subscription_id: parsed.stripeSubscriptionId ?? null,
        current_period_end: parsed.currentPeriodEnd
          ? parsed.currentPeriodEnd.toISOString()
          : null,
        cancel_at_period_end: parsed.cancelAtPeriodEnd,
      })
      .select()
      .single();
    if (error) throw new Error(`supabase createSubscription: ${error.message}`);
    return toSubscription(data as SubscriptionRow);
  }

  async getSubscriptionByOrg(
    organizationId: string,
  ): Promise<Subscription | null> {
    const { data, error } = await this.client
      .from(TABLES.subscriptions)
      .select()
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error)
      throw new Error(`supabase getSubscriptionByOrg: ${error.message}`);
    return data ? toSubscription(data as SubscriptionRow) : null;
  }

  async getSubscriptionByStripeId(
    stripeSubscriptionId: string,
  ): Promise<Subscription | null> {
    const { data, error } = await this.client
      .from(TABLES.subscriptions)
      .select()
      .eq("stripe_subscription_id", stripeSubscriptionId)
      .maybeSingle();
    if (error)
      throw new Error(`supabase getSubscriptionByStripeId: ${error.message}`);
    return data ? toSubscription(data as SubscriptionRow) : null;
  }

  async listSubscriptions(): Promise<Subscription[]> {
    const { data, error } = await this.client
      .from(TABLES.subscriptions)
      .select()
      .order("created_at", { ascending: false });
    if (error) throw new Error(`supabase listSubscriptions: ${error.message}`);
    return (data as SubscriptionRow[]).map(toSubscription);
  }

  async updateSubscription(
    id: string,
    patch: UpdateSubscription,
  ): Promise<Subscription> {
    const row: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (patch.planId !== undefined) row.plan_id = patch.planId;
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.stripeCustomerId !== undefined)
      row.stripe_customer_id = patch.stripeCustomerId;
    if (patch.stripeSubscriptionId !== undefined)
      row.stripe_subscription_id = patch.stripeSubscriptionId;
    if (patch.currentPeriodEnd !== undefined)
      row.current_period_end = patch.currentPeriodEnd
        ? patch.currentPeriodEnd.toISOString()
        : null;
    if (patch.cancelAtPeriodEnd !== undefined)
      row.cancel_at_period_end = patch.cancelAtPeriodEnd;
    const { data, error } = await this.client
      .from(TABLES.subscriptions)
      .update(row)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(`supabase updateSubscription: ${error.message}`);
    return toSubscription(data as SubscriptionRow);
  }
}
