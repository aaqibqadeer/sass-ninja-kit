"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface TrialDaysFormProps {
  initialTrialDays: number;
}

/** Edit the platform-wide trial length (super-admin, §14). */
export function TrialDaysForm({ initialTrialDays }: TrialDaysFormProps) {
  const [value, setValue] = useState(String(initialTrialDays));
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trialDays: Number(value) }),
      });
      const data = (await res.json()) as { trialDays?: number; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Could not save");
        return;
      }
      toast.success(`Trial length set to ${data.trialDays} days`);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-xs flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="trial-days">Trial length (days)</Label>
        <Input
          id="trial-days"
          type="number"
          min={0}
          max={365}
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <p className="text-muted-foreground text-xs">
          Applied to new organizations at creation. Set 0 to disable trials.
        </p>
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
