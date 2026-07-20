import { LogoutButton } from "@/components/auth/LogoutButton";
import {
  WorkspaceSwitcher,
  type WorkspaceOption,
} from "@/components/shared/WorkspaceSwitcher";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { features } from "@/config/features";
import { requireAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { ORG_ROLES } from "@/lib/db/schema";

// Per-user page (reads the session cookie) — never statically prerendered.
export const dynamic = "force-dynamic";

// Protected page — `requireAuth()` redirects to /login when there's no session.
// Also serves as the post-login redirect target and a smoke test for auth.
export default async function DashboardPage() {
  const session = await requireAuth();

  // Multi-tenant only: resolve the user's workspaces for the switcher. When the
  // flag is off, none of this renders and the single silent org is unaffected.
  let workspaces: WorkspaceOption[] = [];
  if (features.multiTenant) {
    const memberships = await db.listMembershipsForUser(session.user.id);
    const orgs = await Promise.all(
      memberships.map((m) => db.getOrganizationById(m.organizationId)),
    );
    workspaces = orgs
      .filter((org): org is NonNullable<typeof org> => org !== null)
      .map((org) => ({ id: org.id, name: org.name }));
  }
  const isOrgAdmin = session.role === ORG_ROLES.admin;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>You are signed in.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {features.multiTenant && workspaces.length > 0 && (
            <WorkspaceSwitcher
              organizations={workspaces}
              activeOrgId={session.organizationId}
            />
          )}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Email</dt>
            <dd>{session.user.email}</dd>
            <dt className="text-muted-foreground">User ID</dt>
            <dd className="font-mono text-xs">{session.user.id}</dd>
            <dt className="text-muted-foreground">Org</dt>
            <dd className="font-mono text-xs">
              {session.organizationId ?? "—"}
            </dd>
            <dt className="text-muted-foreground">Role</dt>
            <dd>{session.role ?? "—"}</dd>
            {session.user.isSuperAdmin && (
              <>
                <dt className="text-muted-foreground">Platform</dt>
                <dd>super admin</dd>
              </>
            )}
          </dl>
          {features.multiTenant && isOrgAdmin && (
            <a
              href="/settings/organization"
              className="text-sm underline underline-offset-4"
            >
              Manage organization
            </a>
          )}
          <LogoutButton />
        </CardContent>
      </Card>
    </main>
  );
}
