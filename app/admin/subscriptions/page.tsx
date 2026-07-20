import { notFound } from "next/navigation";

import {
  SubscriptionsTable,
  type SubscriptionRow,
} from "@/components/admin/SubscriptionsTable";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { features } from "@/config/features";
import { requireSuperAdmin } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { payments } from "@/lib/payments";

export const dynamic = "force-dynamic";

/**
 * Cross-org subscription list with cancel + refund — super-admin only (§15).
 * 404s when payments is off (subscriptions only exist with payments).
 */
export default async function AdminSubscriptionsPage() {
  await requireSuperAdmin();
  if (!features.payments.enabled) notFound();

  const subscriptions = await db.listSubscriptions();
  const rows: SubscriptionRow[] = await Promise.all(
    subscriptions.map(async (sub) => {
      const [org, plan] = await Promise.all([
        db.getOrganizationById(sub.organizationId),
        db.getPlanById(sub.planId),
      ]);
      const charge = sub.stripeCustomerId
        ? await payments.getLatestCharge(sub.stripeCustomerId)
        : null;
      return {
        id: sub.id,
        orgName: org?.name ?? "(unknown)",
        planName: plan?.name ?? "(unknown)",
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd
          ? sub.currentPeriodEnd.toISOString()
          : null,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        stripeSubscriptionId: sub.stripeSubscriptionId ?? null,
        chargeId: charge?.chargeId ?? null,
        chargeAmount: charge?.amount ?? null,
        currency: charge?.currency ?? null,
      };
    }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscriptions</CardTitle>
        <CardDescription>
          Every organization&apos;s subscription. Cancel or refund below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SubscriptionsTable rows={rows} />
      </CardContent>
    </Card>
  );
}
