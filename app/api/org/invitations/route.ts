import { NextResponse } from "next/server";
import { z } from "zod";

import { features } from "@/config/features";
import { db } from "@/lib/db";
import { roleSchema } from "@/lib/db/schema";
import { authErrorResponse, authorize } from "@/lib/auth/roles";
import { inviteToOrg } from "@/lib/org/invitations";

const createSchema = z.object({
  email: z.email(),
  role: roleSchema.default("user"),
});

function notFound(): NextResponse {
  return NextResponse.json({ error: "Not available" }, { status: 404 });
}

/** List the active org's invitations (member-visible). */
export async function GET(): Promise<NextResponse> {
  if (!features.multiTenant) return notFound();
  try {
    const session = await authorize({ permission: "members:read" });
    if (!session.organizationId) {
      return NextResponse.json({ invitations: [] });
    }
    const invitations = await db.listInvitations(session.organizationId);
    return NextResponse.json({ invitations });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/** Invite someone to the active org by email (admin only). */
export async function POST(request: Request): Promise<NextResponse> {
  if (!features.multiTenant) return notFound();
  try {
    const session = await authorize({ permission: "members:invite" });
    if (!session.organizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 },
      );
    }
    const parsed = createSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    const org = await db.getOrganizationById(session.organizationId);
    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }
    await inviteToOrg({
      org,
      email: parsed.data.email,
      role: parsed.data.role,
      invitedBy: session.user,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
