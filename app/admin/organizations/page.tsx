import { notFound } from "next/navigation";

import { DataTable } from "@/components/shared/DataTable";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { features } from "@/config/features";
import { requireRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import type { Organization } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

interface OrgRow {
  org: Organization;
  role: string;
}

/**
 * Organizations the current admin belongs to (multi-tenant only). Scoped to the
 * viewer's memberships — an org admin manages their own orgs, not the platform's.
 */
export default async function AdminOrganizationsPage() {
  if (!features.multiTenant) notFound();
  const session = await requireRole("admin");

  const memberships = await db.listMembershipsForUser(session.user.id);
  const rows: OrgRow[] = (
    await Promise.all(
      memberships.map(async (m) => {
        const org = await db.getOrganizationById(m.organizationId);
        return org ? { org, role: m.role } : null;
      }),
    )
  ).filter((r): r is OrgRow => r !== null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organizations</CardTitle>
        <CardDescription>Workspaces you belong to.</CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          rows={rows}
          getRowKey={(row) => row.org.id}
          columns={[
            { key: "name", header: "Name", cell: (row) => row.org.name },
            {
              key: "slug",
              header: "Slug",
              cell: (row) => (
                <span className="text-muted-foreground">{row.org.slug}</span>
              ),
            },
            {
              key: "role",
              header: "Your role",
              cell: (row) => <Badge variant="secondary">{row.role}</Badge>,
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}
