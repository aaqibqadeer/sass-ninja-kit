import { NextResponse } from "next/server";
import { z } from "zod";

import { features } from "@/config/features";
import { authErrorResponse, authorize } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { SUBSCRIPTION_STATUSES } from "@/lib/db/schema";
import { payments } from "@/lib/payments";

const schema = z.object({
  subscriptionId: z.string().min(1),
  stripeSubscriptionId: z.string().nullish(),
});

/** Cancel any org's subscription (super-admin, cross-org — §15). */
export async function POST(request: Request): Promise<NextResponse> {
  if (!features.admin || !features.payments.enabled) {
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
    if (parsed.data.stripeSubscriptionId) {
      await payments.cancelSubscription(parsed.data.stripeSubscriptionId);
    }
    await db.updateSubscription(parsed.data.subscriptionId, {
      status: SUBSCRIPTION_STATUSES.canceled,
      cancelAtPeriodEnd: true,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
