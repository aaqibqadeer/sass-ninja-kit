"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export interface PendingInvite {
  id: string;
  email: string;
  role: string;
}

interface PendingInvitesProps {
  invites: PendingInvite[];
}

/** Pending invitations for the active org, with a revoke action (admin). */
export function PendingInvites({ invites }: PendingInvitesProps) {
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function revoke(id: string) {
    setError(null);
    setBusyId(id);
    const res = await fetch("/api/org/invitations/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      window.location.reload();
      return;
    }
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setError(data.error ?? "Could not revoke invitation");
    setBusyId(null);
  }

  if (invites.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No pending invitations.</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <ul className="flex flex-col divide-y">
        {invites.map((invite) => (
          <li
            key={invite.id}
            className="flex items-center justify-between gap-4 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm">{invite.email}</p>
              <p className="text-muted-foreground text-xs">{invite.role}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={busyId === invite.id}
              onClick={() => revoke(invite.id)}
            >
              Revoke
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
