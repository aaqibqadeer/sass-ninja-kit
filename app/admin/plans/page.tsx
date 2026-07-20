import { PlanManager } from "@/components/admin/PlanManager";
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

export const dynamic = "force-dynamic";

/** Pricing plan CRUD — super-admin only (§15). Plans are platform-level. */
export default async function AdminPlansPage() {
  await requireSuperAdmin();
  const plans = await db.listPlans();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pricing plans</CardTitle>
        <CardDescription>
          Platform-wide plans. Count and names are data, not code.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PlanManager
          plans={plans}
          annualBilling={features.payments.annualBilling}
          paymentsEnabled={features.payments.enabled}
        />
      </CardContent>
    </Card>
  );
}
