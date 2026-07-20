"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Built-in org roles offered in the UI. Roles are extensible (config/permissions.ts);
 * a fork adding a role can list it here. */
const ROLE_OPTIONS = ["user", "admin"] as const;

/** Invite a member to the active org by email. Admin-only surface. */
export function InviteMemberForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("user");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const res = await fetch("/api/org/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not send invitation");
        return;
      }
      setNotice(`Invitation sent to ${email}.`);
      setEmail("");
      // Reload so the pending-invites list reflects the new invite.
      window.location.reload();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="invite-email">Email</Label>
        <Input
          id="invite-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@example.com"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="invite-role">Role</Label>
        <select
          id="invite-role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-muted-foreground text-sm">
          {notice}
        </p>
      )}
      <Button type="submit" disabled={loading}>
        {loading ? "Sending…" : "Send invitation"}
      </Button>
    </form>
  );
}
