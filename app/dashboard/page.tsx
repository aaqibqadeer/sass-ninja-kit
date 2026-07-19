import { LogoutButton } from "@/components/auth/LogoutButton";
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
// Also serves as the post-login redirect target and a smoke test for auth.
export default async function DashboardPage() {
  const session = await requireAuth();
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>You are signed in.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Email</dt>
            <dd>{session.user.email}</dd>
            <dt className="text-muted-foreground">User ID</dt>
            <dd className="font-mono text-xs">{session.user.id}</dd>
            <dt className="text-muted-foreground">Org</dt>
            <dd className="font-mono text-xs">
              {session.organizationId ?? "—"}
            </dd>
          </dl>
          <LogoutButton />
        </CardContent>
      </Card>
    </main>
  );
}
