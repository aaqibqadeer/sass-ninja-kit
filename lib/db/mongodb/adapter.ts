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
  ORG_ROLES,
  newOrganizationMemberSchema,
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

/* -- Schemas & models (registered once) ------------------------------------ */

const userSchema = new Schema<UserDoc>(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: null },
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

/* -- Mappers --------------------------------------------------------------- */

function toUser(doc: UserDoc): User {
  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name,
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

function requireUri(): string {
  if (!env.MONGODB_URI) {
    throw new Error("MongoAdapter: MONGODB_URI is not configured");
  }
  return env.MONGODB_URI;
}

export class MongoAdapter implements DatabaseAdapter {
  private connection: Promise<typeof mongoose> | null = null;

  /** Connect once, lazily; reuse the connection thereafter. */
  private async connect(): Promise<void> {
    if (mongoose.connection.readyState === 1) return;
    this.connection ??= mongoose.connect(requireUri());
    await this.connection;
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
    const doc = await UserModel.findByIdAndUpdate(id, patch, { new: true })
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

  async disconnect(): Promise<void> {
    if (this.connection) {
      await mongoose.disconnect();
      this.connection = null;
    }
  }
}
