import { NextResponse } from "next/server";
import { z } from "zod";

import { features } from "@/config/features";
import { authErrorResponse, authorize } from "@/lib/auth/roles";
import { startCheckout } from "@/lib/payments/checkout";

const schema = z.object({
  planId: z.string().min(1, "planId is required"),
  cadence: z.enum(["monthly", "annual"]).default("monthly"),
});

/** Start a Stripe Checkout session for the active org (payments only). */
export async function POST(request: Request): Promise<NextResponse> {
  if (!features.payments.enabled) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  try {
    const session = await authorize({ permission: "org:manage" });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    const { url } = await startCheckout(
      session,
      parsed.data.planId,
      parsed.data.cadence,
    );
    return NextResponse.json({ ok: true, url });
  } catch (error) {
    return authErrorResponse(error);
  }
}
