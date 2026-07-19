"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export interface AdminNavProps {
  isOrgAdmin: boolean;
  isSuperAdmin: boolean;
  multiTenant: boolean;
  paymentsEnabled: boolean;
}

/** Tab nav for the admin panel; tabs show per the viewer's tier + flags. */
export function AdminNav({
  isOrgAdmin,
  isSuperAdmin,
  multiTenant,
  paymentsEnabled,
}: AdminNavProps) {
  const pathname = usePathname();

  const links = [
    { href: "/admin", label: "Overview", show: true },
    { href: "/admin/users", label: "Users", show: isOrgAdmin },
    {
      href: "/admin/organizations",
      label: "Organizations",
      show: isOrgAdmin && multiTenant,
    },
    { href: "/admin/plans", label: "Plans", show: isSuperAdmin },
    {
      href: "/admin/subscriptions",
      label: "Subscriptions",
      show: isSuperAdmin && paymentsEnabled,
    },
    { href: "/admin/settings", label: "Settings", show: isSuperAdmin },
  ].filter((link) => link.show);

  return (
    <nav className="flex flex-wrap gap-1 border-b pb-2">
      {links.map((link) => {
        const active =
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-secondary text-secondary-foreground font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
