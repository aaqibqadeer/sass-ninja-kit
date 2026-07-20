import type { ReactNode } from "react";

import { notFound } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { AppHeader } from "@/components/shared/AppHeader";
import { features } from "@/config/features";
import { requireAuth } from "@/lib/auth/server";
import { ORG_ROLES } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/**
 * Admin panel shell. Gated on the `admin` flag (404 when off) and entered by an
 * **org admin OR a platform super-admin** — the two tiers stay distinct (§14):
 * org-admin tabs and super-admin tabs each enforce their own guard on the page.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!features.admin) notFound();

  const session = await requireAuth();
  const isOrgAdmin = session.role === ORG_ROLES.admin;
  const isSuperAdmin = session.user.isSuperAdmin;
  if (!isOrgAdmin && !isSuperAdmin) notFound();

  return (
    <>
      <AppHeader session={session} />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold">Admin</h1>
          <p className="text-muted-foreground text-sm">
            Manage your workspace
            {isSuperAdmin ? " and platform billing" : ""}.
          </p>
        </div>
        <AdminNav
          isOrgAdmin={isOrgAdmin}
          isSuperAdmin={isSuperAdmin}
          multiTenant={features.multiTenant}
          paymentsEnabled={features.payments.enabled}
        />
        <div>{children}</div>
      </div>
    </>
  );
}
