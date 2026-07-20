import { AppHeader } from "@/components/shared/AppHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAuth } from "@/lib/auth/server";

// Per-user page (reads the session cookie) — never statically prerendered.
export const dynamic = "force-dynamic";

// Protected page — `requireAuth()` redirects to /login when there's no session.
// Also serves as the post-login redirect target and a smoke test for auth. The
// global nav (workspace switcher, admin/org links, sign-out) lives in AppHeader.
export default async function DashboardPage() {
  const session = await requireAuth();

  return (
    <>
      <AppHeader session={session} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-semibold">
            Welcome back{session.user.name ? `, ${session.user.name}` : ""}.
          </h1>
          <p className="text-muted-foreground text-sm">
            You&apos;re signed in. Use the navigation above to look around.
          </p>
        </div>

        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your current session.</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </main>
    </>
  );
}
