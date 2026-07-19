import { TrialDaysForm } from "@/components/admin/TrialDaysForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireSuperAdmin } from "@/lib/auth/roles";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Platform settings — super-admin only (§14). `trialDays` is a platform-wide
 * app_setting, so it lives here rather than under the org-admin surfaces.
 */
export default async function AdminSettingsPage() {
  await requireSuperAdmin();
  const settings = await db.getAppSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform settings</CardTitle>
        <CardDescription>Applies across every organization.</CardDescription>
      </CardHeader>
      <CardContent>
        <TrialDaysForm initialTrialDays={settings.trialDays} />
      </CardContent>
    </Card>
  );
}
