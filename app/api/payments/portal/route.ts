import { NextResponse } from "next/server";

import { features } from "@/config/features";
import { authErrorResponse, authorize } from "@/lib/auth/roles";
import { openBillingPortal } from "@/lib/payments/checkout";

/** Open the Stripe billing/customer portal for the active org (payments only). */
export async function POST(): Promise<NextResponse> {
  if (!features.payments.enabled) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  try {
    const session = await authorize({ permission: "org:manage" });
    const { url } = await openBillingPortal(session);
    return NextResponse.json({ ok: true, url });
  } catch (error) {
    return authErrorResponse(error);
  }
}
