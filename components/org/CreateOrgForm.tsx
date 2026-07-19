"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateOrgFormProps {
  /** Called after a successful create (e.g. to close a dialog). Defaults to a
   * full reload so the switcher/session pick up the new active org. */
  onSuccess?: (organizationId: string) => void;
}

/** Create a new organization. Posts to `/api/org` and switches to it. */
export function CreateOrgForm({ onSuccess }: CreateOrgFormProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json()) as {
        error?: string;
        organizationId?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not create organization");
        return;
      }
      if (onSuccess && data.organizationId) onSuccess(data.organizationId);
      else window.location.reload();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="org-name">Organization name</Label>
        <Input
          id="org-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme Inc."
        />
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <Button type="submit" disabled={loading}>
        {loading ? "Creating…" : "Create organization"}
      </Button>
    </form>
  );
}
