"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

const ROLE_OPTIONS = ["user", "admin"] as const;

export interface MemberRow {
  userId: string;
  email: string;
  name: string | null;
  role: string;
}

interface MemberListProps {
  members: MemberRow[];
  /** The viewer — their own row can't be role-changed or removed here. */
  currentUserId: string;
}

/** Roster of the active org's members with role + remove controls (admin). */
export function MemberList({ members, currentUserId }: MemberListProps) {
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function post(url: string, body: unknown): Promise<boolean> {
    setError(null);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Action failed");
      return false;
    }
    return true;
  }

  async function changeRole(userId: string, role: string) {
    setBusyId(userId);
    const ok = await post("/api/org/members/role", { userId, role });
    if (ok) window.location.reload();
    else setBusyId(null);
  }

  async function remove(userId: string) {
    setBusyId(userId);
    const ok = await post("/api/org/members/remove", { userId });
    if (ok) window.location.reload();
    else setBusyId(null);
  }

  if (members.length === 0) {
    return <p className="text-muted-foreground text-sm">No members yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <ul className="flex flex-col divide-y">
        {members.map((member) => {
          const isSelf = member.userId === currentUserId;
          return (
            <li
              key={member.userId}
              className="flex items-center justify-between gap-4 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm">
                  {member.name ?? member.email}
                  {isSelf && (
                    <span className="text-muted-foreground"> (you)</span>
                  )}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {member.email}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  aria-label={`Role for ${member.email}`}
                  value={member.role}
                  disabled={isSelf || busyId === member.userId}
                  onChange={(e) => changeRole(member.userId, e.target.value)}
                  className="border-input bg-background h-8 rounded-md border px-2 text-sm disabled:opacity-50"
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                  {!ROLE_OPTIONS.includes(
                    member.role as (typeof ROLE_OPTIONS)[number],
                  ) && <option value={member.role}>{member.role}</option>}
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isSelf || busyId === member.userId}
                  onClick={() => remove(member.userId)}
                >
                  Remove
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
