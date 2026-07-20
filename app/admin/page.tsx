import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { features } from "@/config/features";
import { requireAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Admin overview — who you are, your workspace, and (if payments is on) billing. */
export default async function AdminOverviewPage() {
  const session = await requireAuth();
  const isSuperAdmin = session.user.isSuperAdmin;

  const org = session.organizationId
    ? await db.getOrganizationById(session.organizationId)
    : null;

  let planName: string | null = null;
  let subStatus: string | null = null;
  if (features.payments.enabled && session.organizationId) {
    const sub = await db.getSubscriptionByOrg(session.organizationId);
    if (sub) {
      subStatus = sub.status;
      const plan = await db.getPlanById(sub.planId);
      planName = plan?.name ?? null;
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>You</CardTitle>
          <CardDescription>{session.user.email}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="secondary">role: {session.role ?? "—"}</Badge>
          {isSuperAdmin && <Badge>super admin</Badge>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>{org?.name ?? "No organization"}</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          {org?.trialEndsAt
            ? `Trial ends ${org.trialEndsAt.toLocaleDateString()}`
            : "No active trial."}
        </CardContent>
      </Card>

      {features.payments.enabled && (
        <Card className="sm:col-span-2">
          <CardHeader>
            <CardTitle>Billing</CardTitle>
            <CardDescription>
              This workspace&apos;s subscription.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2 text-sm">
            {planName ? (
              <>
                <span>{planName}</span>
                {subStatus && <Badge variant="secondary">{subStatus}</Badge>}
              </>
            ) : (
              <span className="text-muted-foreground">
                No subscription yet.
              </span>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
