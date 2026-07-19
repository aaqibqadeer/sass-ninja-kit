import { NextResponse } from "next/server";
import { z } from "zod";

import { features } from "@/config/features";
import { db } from "@/lib/db";
import { authErrorResponse, authorize } from "@/lib/auth/roles";
import { revokeInvitation } from "@/lib/org/invitations";

const schema = z.object({ id: z.string().min(1) });

/** Withdraw a pending invitation belonging to the caller's active org (admin). */
export async function POST(request: Request): Promise<NextResponse> {
  if (!features.multiTenant) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  try {
    const session = await authorize({ permission: "members:invite" });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    if (!session.organizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 },
      );
    }
    // Ensure the invitation belongs to the caller's active org.
    const invitations = await db.listInvitations(session.organizationId);
    const target = invitations.find((invite) => invite.id === parsed.data.id);
    if (!target) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 },
      );
    }
    await revokeInvitation(target.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
