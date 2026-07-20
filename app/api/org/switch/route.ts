import { NextResponse } from "next/server";
import { z } from "zod";

import { features } from "@/config/features";
import { db } from "@/lib/db";
import { authErrorResponse, authorize } from "@/lib/auth/roles";
import { setActiveOrgCookie } from "@/lib/org/active-org";

const schema = z.object({ organizationId: z.string().min(1) });

/** Switch the active organization — only to one the caller belongs to. */
export async function POST(request: Request): Promise<NextResponse> {
  if (!features.multiTenant) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  try {
    const session = await authorize();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    const membership = await db.getMembership(
      parsed.data.organizationId,
      session.user.id,
    );
    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of that organization" },
        { status: 403 },
      );
    }
    await setActiveOrgCookie(parsed.data.organizationId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
