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
  INVITATION_STATUSES,
  ORG_ROLES,
  newInvitationSchema,
  newOrganizationMemberSchema,
  type Invitation,
  type InvitationStatus,
  type NewInvitation,
  type NewOrganization,
  type NewOrganizationMember,
  type NewUser,
  type Organization,
  type OrganizationMember,
  type OrgRole,
  type UpdateOrganization,
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
  },
  { timestamps: true, collection: "organizations" },
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

  async updateOrganization(
    id: string,
    patch: UpdateOrganization,
  ): Promise<Organization> {
    await this.connect();
    const doc = await OrganizationModel.findByIdAndUpdate(id, patch, {
      new: true,
    })
      .lean<OrganizationDoc>()
      .exec();
    if (!doc) throw new Error(`mongo updateOrganization: org ${id} not found`);
    return toOrganization(doc);
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

  async disconnect(): Promise<void> {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      connectionPromise = null;
    }
  }
}
