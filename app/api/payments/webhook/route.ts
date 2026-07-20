import { NextResponse } from "next/server";

import { features } from "@/config/features";
import { payments, type PaymentsWebhookEvent } from "@/lib/payments";
import { applyWebhookEvent } from "@/lib/payments/webhook";

// Webhooks need the raw body for signature verification and must never be
// statically optimised.
export const dynamic = "force-dynamic";

/**
 * Stripe webhook receiver. Public (bypasses the middleware login redirect — see
 * middleware.ts) because it's authenticated by the Stripe signature, not a
 * session cookie. Keeps the subscription table in sync with Stripe.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!features.payments.enabled) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  let event: PaymentsWebhookEvent;
  try {
    const rawBody = await request.text();
    event = await payments.parseWebhookEvent(rawBody, signature);
  } catch (error) {
    return NextResponse.json(
      { error: `Signature verification failed: ${(error as Error).message}` },
      { status: 400 },
    );
  }

  try {
    await applyWebhookEvent(event);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message ?? "Webhook handling failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
