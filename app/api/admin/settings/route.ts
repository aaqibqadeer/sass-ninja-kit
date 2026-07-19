import { NextResponse } from "next/server";
import { z } from "zod";

import { features } from "@/config/features";
import { authErrorResponse, authorize } from "@/lib/auth/roles";
import { db } from "@/lib/db";

const schema = z.object({
  trialDays: z.number().int().min(0).max(365),
});

/** Update platform settings — trialDays (super-admin only, §14). */
export async function PATCH(request: Request): Promise<NextResponse> {
  if (!features.admin) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  try {
    await authorize({ superAdmin: true });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    const settings = await db.updateAppSettings({
      trialDays: parsed.data.trialDays,
    });
    return NextResponse.json({ ok: true, trialDays: settings.trialDays });
  } catch (error) {
    return authErrorResponse(error);
  }
}
