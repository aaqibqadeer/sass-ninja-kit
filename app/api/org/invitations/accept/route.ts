import { NextResponse } from "next/server";
import { z } from "zod";

import { features } from "@/config/features";
import { DEFAULT_AUTHED_PATH } from "@/lib/auth/constants";
import { authErrorResponse, authorize } from "@/lib/auth/roles";
import { setActiveOrgCookie } from "@/lib/org/active-org";
import { acceptInvitation } from "@/lib/org/invitations";

const schema = z.object({ token: z.string().min(1) });

/** Accept an invitation as the signed-in user, then switch to that org. */
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
    const { organizationId } = await acceptInvitation(
      parsed.data.token,
      session.user,
    );
    await setActiveOrgCookie(organizationId);
    return NextResponse.json({ ok: true, redirect: DEFAULT_AUTHED_PATH });
  } catch (error) {
    return authErrorResponse(error);
  }
}
