/**
 * lib/db/mongodb/adapter.ts — MongoDB implementation of DatabaseAdapter.
 *
 * Uses Mongoose. Every tenant-scoped collection carries an indexed
 * `organization_id` field (§1.3); membership is additionally uniquely indexed on
 * `(organization_id, user_id)`. Connection is established lazily on first query
 * and reused. Documents are mapped to the canonical camelCase domain models in
 * ../schema (Mongo stores `_id`/snake_case; the domain layer never sees them).
 */

import mongoose, { Schema, type Model } from "mongoose";

import { env } from "@/config/env.schema";
import type { DatabaseAdapter } from "../adapter";
import {
  DEFAULT_TRIAL_DAYS,
  INVITATION_STATUSES,
  ORG_ROLES,
  SUBSCRIPTION_STATUSES,
  newInvitationSchema,
  newOrganizationMemberSchema,
  newPlanSchema,
  newSubscriptionSchema,
  type AppSettings,
  type Invitation,
  type InvitationStatus,
  type NewInvitation,
  type NewOrganization,
  type NewOrganizationMember,
  type NewPlan,
  type NewSubscription,
  type NewUser,
  type Organization,
  type OrganizationMember,
  type OrgRole,
  type Plan,
  type Subscription,
  type UpdateAppSettings,
  type UpdateOrganization,
  type UpdatePlan,
  type UpdateSubscription,
  type UpdateUser,
  type User,
} from "../schema";

/* -- Document shapes (as stored, incl. Mongoose-managed fields) ------------ */

interface UserDoc {
  _id: mongoose.Types.ObjectId;
  email: string;
  name: string | null;
  is_super_admin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface OrganizationDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  stripe_customer_id: string | null;
  trial_ends_at: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PlanDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string | null;
  price_monthly: number;
  price_annual: number | null;
  annual_discount_percent: number | null;
  limits: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
  stripe_product_id: string | null;
  stripe_price_id_monthly: string | null;
  stripe_price_id_annual: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AppSettingsDoc {
  _id: mongoose.Types.ObjectId;
  key: string;
  trial_days: number;
  createdAt: Date;
  updatedAt: Date;
}

interface SubscriptionDoc {
  _id: mongoose.Types.ObjectId;
  organization_id: mongoose.Types.ObjectId;
  plan_id: mongoose.Types.ObjectId;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: Date | null;
  cancel_at_period_end: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface OrganizationMemberDoc {
  _id: mongoose.Types.ObjectId;
  organization_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

interface InvitationDoc {
  _id: mongoose.Types.ObjectId;
  organization_id: mongoose.Types.ObjectId;
  email: string;
  role: string;
  token: string;
  status: string;
  invited_by_user_id: mongoose.Types.ObjectId;
  expires_at: Date;
  createdAt: Date;
  updatedAt: Date;
}

/* -- Schemas & models (registered once) ------------------------------------ */

const userSchema = new Schema<UserDoc>(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: null },
    // Platform-level super-admin flag (§14) — not tied to any org membership.
    is_super_admin: { type: Boolean, required: true, default: false },
  },
  { timestamps: true, collection: "users" },
);

const organizationSchema = new Schema<OrganizationDoc>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    // Billing linkage (Phase 5). Indexed for the webhook's customer→org lookup.
    stripe_customer_id: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },
    trial_ends_at: { type: Date, default: null },
  },
  { timestamps: true, collection: "organizations" },
);

// Plans are PLATFORM-level — no organization_id (§15). Monetary fields are
// integer minor units (cents).
const planSchema = new Schema<PlanDoc>(
  {
    name: { type: String, required: true },
    description: { type: String, default: null },
    price_monthly: { type: Number, required: true },
    price_annual: { type: Number, default: null },
    annual_discount_percent: { type: Number, default: null },
    limits: { type: Schema.Types.Mixed, default: {} },
    is_active: { type: Boolean, required: true, default: true },
    sort_order: { type: Number, required: true, default: 0 },
    stripe_product_id: { type: String, default: null },
    stripe_price_id_monthly: { type: String, default: null },
    stripe_price_id_annual: { type: String, default: null },
  },
  { timestamps: true, collection: "plans" },
);

// Platform-level singleton settings row (unique `key`).
const appSettingsSchema = new Schema<AppSettingsDoc>(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    trial_days: { type: Number, required: true, default: DEFAULT_TRIAL_DAYS },
  },
  { timestamps: true, collection: "app_settings" },
);

const subscriptionSchema = new Schema<SubscriptionDoc>(
  {
    // Tenant key — indexed on every tenant-scoped collection (§1.3).
    organization_id: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    plan_id: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
    status: {
      type: String,
      required: true,
      default: SUBSCRIPTION_STATUSES.trialing,
    },
    stripe_customer_id: { type: String, default: null },
    stripe_subscription_id: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },
    current_period_end: { type: Date, default: null },
    cancel_at_period_end: { type: Boolean, required: true, default: false },
  },
  { timestamps: true, collection: "subscriptions" },
);

const organizationMemberSchema = new Schema<OrganizationMemberDoc>(
  {
    // Tenant key — indexed on every tenant-scoped collection (§1.3).
    organization_id: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: { type: String, required: true, default: ORG_ROLES.user },
  },
  { timestamps: true, collection: "organization_members" },
);
organizationMemberSchema.index(
  { organization_id: 1, user_id: 1 },
  { unique: true },
);

const invitationSchema = new Schema<InvitationDoc>(
  {
    // Tenant key — indexed on every tenant-scoped collection (§1.3).
    organization_id: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    email: { type: String, required: true, index: true },
    role: { type: String, required: true, default: ORG_ROLES.user },
    token: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      required: true,
      default: INVITATION_STATUSES.pending,
    },
    invited_by_user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expires_at: { type: Date, required: true },
  },
  { timestamps: true, collection: "organization_invitations" },
);

/** Reuse existing models across hot-reloads / repeated imports. */
function model<T>(name: string, schema: Schema<T>): Model<T> {
  return (
    (mongoose.models[name] as Model<T> | undefined) ??
    mongoose.model<T>(name, schema)
  );
}

const UserModel = model<UserDoc>("User", userSchema);
const OrganizationModel = model<OrganizationDoc>(
  "Organization",
  organizationSchema,
);
const OrganizationMemberModel = model<OrganizationMemberDoc>(
  "OrganizationMember",
  organizationMemberSchema,
);
const InvitationModel = model<InvitationDoc>("Invitation", invitationSchema);
const PlanModel = model<PlanDoc>("Plan", planSchema);
const AppSettingsModel = model<AppSettingsDoc>(
  "AppSettings",
  appSettingsSchema,
);
const SubscriptionModel = model<SubscriptionDoc>(
  "Subscription",
  subscriptionSchema,
);

/* -- Mappers --------------------------------------------------------------- */

function toUser(doc: UserDoc): User {
  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name,
    isSuperAdmin: doc.is_super_admin ?? false,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toOrganization(doc: OrganizationDoc): Organization {
  return {
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    stripeCustomerId: doc.stripe_customer_id ?? null,
    trialEndsAt: doc.trial_ends_at ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toPlan(doc: PlanDoc): Plan {
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description ?? null,
    priceMonthly: doc.price_monthly,
    priceAnnual: doc.price_annual ?? null,
    annualDiscountPercent: doc.annual_discount_percent ?? null,
    limits: doc.limits ?? {},
    isActive: doc.is_active,
    sortOrder: doc.sort_order,
    stripeProductId: doc.stripe_product_id ?? null,
    stripePriceIdMonthly: doc.stripe_price_id_monthly ?? null,
    stripePriceIdAnnual: doc.stripe_price_id_annual ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toAppSettings(doc: AppSettingsDoc): AppSettings {
  return {
    id: doc._id.toString(),
    trialDays: doc.trial_days,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toSubscription(doc: SubscriptionDoc): Subscription {
  return {
    id: doc._id.toString(),
    organizationId: doc.organization_id.toString(),
    planId: doc.plan_id.toString(),
    status: doc.status as Subscription["status"],
    stripeCustomerId: doc.stripe_customer_id ?? null,
    stripeSubscriptionId: doc.stripe_subscription_id ?? null,
    currentPeriodEnd: doc.current_period_end ?? null,
    cancelAtPeriodEnd: doc.cancel_at_period_end,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toMember(doc: OrganizationMemberDoc): OrganizationMember {
  return {
    id: doc._id.toString(),
    organizationId: doc.organization_id.toString(),
    userId: doc.user_id.toString(),
    role: doc.role,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toInvitation(doc: InvitationDoc): Invitation {
  return {
    id: doc._id.toString(),
    organizationId: doc.organization_id.toString(),
    email: doc.email,
    role: doc.role,
    token: doc.token,
    status: doc.status as Invitation["status"],
    invitedByUserId: doc.invited_by_user_id.toString(),
    expiresAt: doc.expires_at,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function requireUri(): string {
  if (!env.MONGODB_URI) {
    throw new Error("MongoAdapter: MONGODB_URI is not configured");
  }
  return env.MONGODB_URI;
}

/** Connect once, lazily; reuse the singleton connection thereafter. Exported so
 * the auth adapter (which stores credentials in the same Mongo connection) can
 * share it. */
let connectionPromise: Promise<typeof mongoose> | null = null;
export async function connectMongo(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  connectionPromise ??= mongoose.connect(requireUri());
  await connectionPromise;
}

export class MongoAdapter implements DatabaseAdapter {
  private async connect(): Promise<void> {
    await connectMongo();
  }

  /* -- Users -------------------------------------------------------------- */

  async createUser(input: NewUser): Promise<User> {
    await this.connect();
    const created = await UserModel.create({
      email: input.email,
      name: input.name ?? null,
    });
    return toUser(created.toObject<UserDoc>());
  }

  async getUserById(id: string): Promise<User | null> {
    await this.connect();
    const doc = await UserModel.findById(id).lean<UserDoc>().exec();
    return doc ? toUser(doc) : null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    await this.connect();
    const doc = await UserModel.findOne({ email }).lean<UserDoc>().exec();
    return doc ? toUser(doc) : null;
  }

  async updateUser(id: string, patch: UpdateUser): Promise<User> {
    await this.connect();
    // Map camelCase domain fields to the stored field names.
    const update: Record<string, unknown> = {};
    if (patch.email !== undefined) update.email = patch.email;
    if (patch.name !== undefined) update.name = patch.name;
    if (patch.isSuperAdmin !== undefined)
      update.is_super_admin = patch.isSuperAdmin;
    const doc = await UserModel.findByIdAndUpdate(id, update, { new: true })
      .lean<UserDoc>()
      .exec();
    if (!doc) throw new Error(`mongo updateUser: user ${id} not found`);
    return toUser(doc);
  }

  async deleteUser(id: string): Promise<void> {
    await this.connect();
    await UserModel.findByIdAndDelete(id).exec();
  }

  /* -- Organizations ------------------------------------------------------ */

  async createOrganization(input: NewOrganization): Promise<Organization> {
    await this.connect();
    const created = await OrganizationModel.create({
      name: input.name,
      slug: input.slug,
      trial_ends_at: input.trialEndsAt ?? null,
    });
    return toOrganization(created.toObject<OrganizationDoc>());
  }

  async getOrganizationById(id: string): Promise<Organization | null> {
    await this.connect();
    const doc = await OrganizationModel.findById(id)
      .lean<OrganizationDoc>()
      .exec();
    return doc ? toOrganization(doc) : null;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    await this.connect();
    const doc = await OrganizationModel.findOne({ slug })
      .lean<OrganizationDoc>()
      .exec();
    return doc ? toOrganization(doc) : null;
  }

  async updateOrganization(
    id: string,
    patch: UpdateOrganization,
  ): Promise<Organization> {
    await this.connect();
    const update: Record<string, unknown> = {};
    if (patch.name !== undefined) update.name = patch.name;
    if (patch.slug !== undefined) update.slug = patch.slug;
    if (patch.stripeCustomerId !== undefined)
      update.stripe_customer_id = patch.stripeCustomerId;
    if (patch.trialEndsAt !== undefined)
      update.trial_ends_at = patch.trialEndsAt ?? null;
    const doc = await OrganizationModel.findByIdAndUpdate(id, update, {
      new: true,
    })
      .lean<OrganizationDoc>()
      .exec();
    if (!doc) throw new Error(`mongo updateOrganization: org ${id} not found`);
    return toOrganization(doc);
  }

  async getOrganizationByStripeCustomerId(
    stripeCustomerId: string,
  ): Promise<Organization | null> {
    await this.connect();
    const doc = await OrganizationModel.findOne({
      stripe_customer_id: stripeCustomerId,
    })
      .lean<OrganizationDoc>()
      .exec();
    return doc ? toOrganization(doc) : null;
  }

  async deleteOrganization(id: string): Promise<void> {
    await this.connect();
    await OrganizationModel.findByIdAndDelete(id).exec();
  }

  /* -- Membership (scoped by organization_id) ----------------------------- */

  async addMember(input: NewOrganizationMember): Promise<OrganizationMember> {
    await this.connect();
    const parsed = newOrganizationMemberSchema.parse(input);
    const created = await OrganizationMemberModel.create({
      organization_id: new mongoose.Types.ObjectId(parsed.organizationId),
      user_id: new mongoose.Types.ObjectId(parsed.userId),
      role: parsed.role,
    });
    return toMember(created.toObject<OrganizationMemberDoc>());
  }

  async getMembership(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMember | null> {
    await this.connect();
    const doc = await OrganizationMemberModel.findOne({
      organization_id: organizationId,
      user_id: userId,
    })
      .lean<OrganizationMemberDoc>()
      .exec();
    return doc ? toMember(doc) : null;
  }

  async listMembers(organizationId: string): Promise<OrganizationMember[]> {
    await this.connect();
    const docs = await OrganizationMemberModel.find({
      organization_id: organizationId,
    })
      .lean<OrganizationMemberDoc[]>()
      .exec();
    return docs.map(toMember);
  }

  async listMembershipsForUser(userId: string): Promise<OrganizationMember[]> {
    await this.connect();
    const docs = await OrganizationMemberModel.find({ user_id: userId })
      .lean<OrganizationMemberDoc[]>()
      .exec();
    return docs.map(toMember);
  }

  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: OrgRole,
  ): Promise<OrganizationMember> {
    await this.connect();
    const doc = await OrganizationMemberModel.findOneAndUpdate(
      { organization_id: organizationId, user_id: userId },
      { role },
      { new: true },
    )
      .lean<OrganizationMemberDoc>()
      .exec();
    if (!doc) {
      throw new Error(
        `mongo updateMemberRole: membership (${organizationId}, ${userId}) not found`,
      );
    }
    return toMember(doc);
  }

  async removeMember(organizationId: string, userId: string): Promise<void> {
    await this.connect();
    await OrganizationMemberModel.deleteOne({
      organization_id: organizationId,
      user_id: userId,
    }).exec();
  }

  /* -- Invitations (scoped by organization_id) ---------------------------- */

  async createInvitation(input: NewInvitation): Promise<Invitation> {
    await this.connect();
    const parsed = newInvitationSchema.parse(input);
    const created = await InvitationModel.create({
      organization_id: new mongoose.Types.ObjectId(parsed.organizationId),
      email: parsed.email,
      role: parsed.role,
      token: parsed.token,
      status: parsed.status,
      invited_by_user_id: new mongoose.Types.ObjectId(parsed.invitedByUserId),
      expires_at: parsed.expiresAt,
    });
    return toInvitation(created.toObject<InvitationDoc>());
  }

  async getInvitationByToken(token: string): Promise<Invitation | null> {
    await this.connect();
    const doc = await InvitationModel.findOne({ token })
      .lean<InvitationDoc>()
      .exec();
    return doc ? toInvitation(doc) : null;
  }

  async listInvitations(organizationId: string): Promise<Invitation[]> {
    await this.connect();
    const docs = await InvitationModel.find({
      organization_id: organizationId,
    })
      .lean<InvitationDoc[]>()
      .exec();
    return docs.map(toInvitation);
  }

  async updateInvitationStatus(
    id: string,
    status: InvitationStatus,
  ): Promise<Invitation> {
    await this.connect();
    const doc = await InvitationModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    )
      .lean<InvitationDoc>()
      .exec();
    if (!doc) throw new Error(`mongo updateInvitationStatus: ${id} not found`);
    return toInvitation(doc);
  }

  async getPendingInvitationForEmail(
    organizationId: string,
    email: string,
  ): Promise<Invitation | null> {
    await this.connect();
    const doc = await InvitationModel.findOne({
      organization_id: organizationId,
      email,
      status: INVITATION_STATUSES.pending,
    })
      .lean<InvitationDoc>()
      .exec();
    return doc ? toInvitation(doc) : null;
  }

  /* -- Plans (platform-level, no organization_id — §15) ------------------- */

  async createPlan(input: NewPlan): Promise<Plan> {
    await this.connect();
    const parsed = newPlanSchema.parse(input);
    const created = await PlanModel.create({
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
    });
    return toPlan(created.toObject<PlanDoc>());
  }

  async getPlanById(id: string): Promise<Plan | null> {
    await this.connect();
    const doc = await PlanModel.findById(id).lean<PlanDoc>().exec();
    return doc ? toPlan(doc) : null;
  }

  async listPlans(): Promise<Plan[]> {
    await this.connect();
    const docs = await PlanModel.find()
      .sort({ sort_order: 1 })
      .lean<PlanDoc[]>()
      .exec();
    return docs.map(toPlan);
  }

  async listActivePlans(): Promise<Plan[]> {
    await this.connect();
    const docs = await PlanModel.find({ is_active: true })
      .sort({ sort_order: 1 })
      .lean<PlanDoc[]>()
      .exec();
    return docs.map(toPlan);
  }

  async updatePlan(id: string, patch: UpdatePlan): Promise<Plan> {
    await this.connect();
    const update: Record<string, unknown> = {};
    if (patch.name !== undefined) update.name = patch.name;
    if (patch.description !== undefined) update.description = patch.description;
    if (patch.priceMonthly !== undefined)
      update.price_monthly = patch.priceMonthly;
    if (patch.priceAnnual !== undefined)
      update.price_annual = patch.priceAnnual;
    if (patch.annualDiscountPercent !== undefined)
      update.annual_discount_percent = patch.annualDiscountPercent;
    if (patch.limits !== undefined) update.limits = patch.limits;
    if (patch.isActive !== undefined) update.is_active = patch.isActive;
    if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder;
    if (patch.stripeProductId !== undefined)
      update.stripe_product_id = patch.stripeProductId;
    if (patch.stripePriceIdMonthly !== undefined)
      update.stripe_price_id_monthly = patch.stripePriceIdMonthly;
    if (patch.stripePriceIdAnnual !== undefined)
      update.stripe_price_id_annual = patch.stripePriceIdAnnual;
    const doc = await PlanModel.findByIdAndUpdate(id, update, { new: true })
      .lean<PlanDoc>()
      .exec();
    if (!doc) throw new Error(`mongo updatePlan: plan ${id} not found`);
    return toPlan(doc);
  }

  async deletePlan(id: string): Promise<void> {
    await this.connect();
    await PlanModel.findByIdAndDelete(id).exec();
  }

  /* -- App settings (platform-level singleton) ---------------------------- */

  async getAppSettings(): Promise<AppSettings> {
    await this.connect();
    const existing = await AppSettingsModel.findOne({ key: "global" })
      .lean<AppSettingsDoc>()
      .exec();
    if (existing) return toAppSettings(existing);
    const created = await AppSettingsModel.create({
      key: "global",
      trial_days: DEFAULT_TRIAL_DAYS,
    });
    return toAppSettings(created.toObject<AppSettingsDoc>());
  }

  async updateAppSettings(patch: UpdateAppSettings): Promise<AppSettings> {
    await this.connect();
    const update: Record<string, unknown> = {};
    if (patch.trialDays !== undefined) update.trial_days = patch.trialDays;
    const doc = await AppSettingsModel.findOneAndUpdate(
      { key: "global" },
      { $set: update, $setOnInsert: { key: "global" } },
      { new: true, upsert: true },
    )
      .lean<AppSettingsDoc>()
      .exec();
    return toAppSettings(doc as AppSettingsDoc);
  }

  /* -- Subscriptions (scoped by organization_id) -------------------------- */

  async createSubscription(input: NewSubscription): Promise<Subscription> {
    await this.connect();
    const parsed = newSubscriptionSchema.parse(input);
    const created = await SubscriptionModel.create({
      organization_id: new mongoose.Types.ObjectId(parsed.organizationId),
      plan_id: new mongoose.Types.ObjectId(parsed.planId),
      status: parsed.status,
      stripe_customer_id: parsed.stripeCustomerId ?? null,
      stripe_subscription_id: parsed.stripeSubscriptionId ?? null,
      current_period_end: parsed.currentPeriodEnd ?? null,
      cancel_at_period_end: parsed.cancelAtPeriodEnd,
    });
    return toSubscription(created.toObject<SubscriptionDoc>());
  }

  async getSubscriptionByOrg(
    organizationId: string,
  ): Promise<Subscription | null> {
    await this.connect();
    const doc = await SubscriptionModel.findOne({
      organization_id: organizationId,
    })
      .sort({ createdAt: -1 })
      .lean<SubscriptionDoc>()
      .exec();
    return doc ? toSubscription(doc) : null;
  }

  async getSubscriptionByStripeId(
    stripeSubscriptionId: string,
  ): Promise<Subscription | null> {
    await this.connect();
    const doc = await SubscriptionModel.findOne({
      stripe_subscription_id: stripeSubscriptionId,
    })
      .lean<SubscriptionDoc>()
      .exec();
    return doc ? toSubscription(doc) : null;
  }

  async listSubscriptions(): Promise<Subscription[]> {
    await this.connect();
    const docs = await SubscriptionModel.find()
      .sort({ createdAt: -1 })
      .lean<SubscriptionDoc[]>()
      .exec();
    return docs.map(toSubscription);
  }

  async updateSubscription(
    id: string,
    patch: UpdateSubscription,
  ): Promise<Subscription> {
    await this.connect();
    const update: Record<string, unknown> = {};
    if (patch.planId !== undefined)
      update.plan_id = new mongoose.Types.ObjectId(patch.planId);
    if (patch.status !== undefined) update.status = patch.status;
    if (patch.stripeCustomerId !== undefined)
      update.stripe_customer_id = patch.stripeCustomerId;
    if (patch.stripeSubscriptionId !== undefined)
      update.stripe_subscription_id = patch.stripeSubscriptionId;
    if (patch.currentPeriodEnd !== undefined)
      update.current_period_end = patch.currentPeriodEnd ?? null;
    if (patch.cancelAtPeriodEnd !== undefined)
      update.cancel_at_period_end = patch.cancelAtPeriodEnd;
    const doc = await SubscriptionModel.findByIdAndUpdate(id, update, {
      new: true,
    })
      .lean<SubscriptionDoc>()
      .exec();
    if (!doc) throw new Error(`mongo updateSubscription: ${id} not found`);
    return toSubscription(doc);
  }

  async disconnect(): Promise<void> {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      connectionPromise = null;
    }
  }
}
