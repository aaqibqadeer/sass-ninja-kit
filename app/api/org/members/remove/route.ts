import { NextResponse } from "next/server";
import { z } from "zod";

import { features } from "@/config/features";
import { db } from "@/lib/db";
import { authErrorResponse, authorize } from "@/lib/auth/roles";

const schema = z.object({ userId: z.string().min(1) });

/** Remove a member from the caller's active org (admin only). */
export async function POST(request: Request): Promise<NextResponse> {
  if (!features.multiTenant) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  try {
    const session = await authorize({ permission: "members:remove" });
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
    if (parsed.data.userId === session.user.id) {
      return NextResponse.json(
        { error: "You can't remove yourself" },
        { status: 400 },
      );
    }
    const membership = await db.getMembership(
      session.organizationId,
      parsed.data.userId,
    );
    if (!membership) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    await db.removeMember(session.organizationId, parsed.data.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
