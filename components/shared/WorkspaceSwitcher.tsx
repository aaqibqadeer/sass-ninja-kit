"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateOrgForm } from "@/components/org/CreateOrgForm";

export interface WorkspaceOption {
  id: string;
  name: string;
}

interface WorkspaceSwitcherProps {
  organizations: WorkspaceOption[];
  activeOrgId: string | null;
}

/**
 * Dropdown for switching the active organization, plus a "Create organization"
 * action. Render only when `features.multiTenant` is on. Data is resolved
 * server-side and passed in; switching posts to `/api/org/switch` then reloads
 * so the session re-resolves the active org and role.
 */
export function WorkspaceSwitcher({
  organizations,
  activeOrgId,
}: WorkspaceSwitcherProps) {
  const [creating, setCreating] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  const active =
    organizations.find((org) => org.id === activeOrgId) ?? organizations[0];

  async function switchTo(organizationId: string) {
    if (organizationId === activeOrgId) return;
    setSwitchingTo(organizationId);
    try {
      const res = await fetch("/api/org/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
      if (res.ok) {
        window.location.reload();
        return;
      }
    } catch {
      // fall through to reset state
    }
    setSwitchingTo(null);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="justify-between gap-2">
            <span className="truncate">
              {active ? active.name : "Select workspace"}
            </span>
            <span aria-hidden="true" className="text-muted-foreground">
              ▾
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-56">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onSelect={(event) => {
                event.preventDefault();
                void switchTo(org.id);
              }}
              className="justify-between"
            >
              <span className="truncate">{org.name}</span>
              {org.id === activeOrgId && (
                <span aria-hidden="true" className="text-muted-foreground">
                  ✓
                </span>
              )}
              {switchingTo === org.id && (
                <span className="text-muted-foreground text-xs">…</span>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setCreating(true);
            }}
          >
            + Create organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create organization</DialogTitle>
            <DialogDescription>
              You&apos;ll become its first admin and switch to it.
            </DialogDescription>
          </DialogHeader>
          <CreateOrgForm />
        </DialogContent>
      </Dialog>
    </>
  );
}
