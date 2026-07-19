import { NextResponse } from "next/server";
import { z } from "zod";

import { features } from "@/config/features";
import { DEFAULT_AUTHED_PATH } from "@/lib/auth/constants";
import { authErrorResponse, authorize } from "@/lib/auth/roles";
import { setActiveOrgCookie } from "@/lib/org/active-org";
import { createOrganizationForUser } from "@/lib/org/organizations";

const schema = z.object({
  name: z.string().min(1, "Organization name is required").max(80),
});

/** Create a new organization (multi-tenant only) and switch to it. */
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
    const org = await createOrganizationForUser(session.user, parsed.data.name);
    await setActiveOrgCookie(org.id);
    return NextResponse.json({
      ok: true,
      organizationId: org.id,
      redirect: DEFAULT_AUTHED_PATH,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
