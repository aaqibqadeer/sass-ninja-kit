import { MemberList, type MemberRow } from "@/components/org/MemberList";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Users in the active org, with role management (org admin). Reuses the existing
 * `MemberList` + `/api/org/members/*` routes. In single-tenant there's only the
 * admin themselves (self-row is locked), so this stays coherent regardless of
 * the `multiTenant` flag.
 */
export default async function AdminUsersPage() {
  const session = await requireRole("admin");
  const orgId = session.organizationId;

  const memberships = orgId ? await db.listMembers(orgId) : [];
  const members: MemberRow[] = await Promise.all(
    memberships.map(async (m) => {
      const user = await db.getUserById(m.userId);
      return {
        userId: m.userId,
        email: user?.email ?? "(unknown)",
        name: user?.name ?? null,
        role: m.role,
      };
    }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>
          People with access to this organization, and their roles.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MemberList members={members} currentUserId={session.user.id} />
      </CardContent>
    </Card>
  );
}
