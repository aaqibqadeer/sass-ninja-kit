"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface SubscriptionRow {
  id: string;
  orgName: string;
  planName: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
  chargeId: string | null;
  /** Latest charge total, integer minor units (cents). */
  chargeAmount: number | null;
  currency: string | null;
}

const STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  active: "default",
  trialing: "secondary",
  past_due: "destructive",
  canceled: "outline",
  incomplete: "secondary",
};

/** Cross-org subscription list with cancel + refund (super-admin, §15). */
export function SubscriptionsTable({ rows }: { rows: SubscriptionRow[] }) {
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  function amountFor(row: SubscriptionRow): string {
    return (
      amounts[row.id] ??
      (row.chargeAmount != null ? (row.chargeAmount / 100).toFixed(2) : "")
    );
  }

  async function cancel(row: SubscriptionRow) {
    const res = await fetch("/api/admin/subscriptions/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscriptionId: row.id,
        stripeSubscriptionId: row.stripeSubscriptionId,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Could not cancel");
    toast.success(`Cancelled ${row.orgName}'s subscription`);
    window.location.reload();
  }

  async function refund(row: SubscriptionRow) {
    if (!row.chargeId) throw new Error("No charge to refund");
    const raw = amountFor(row);
    const amount = raw ? Math.round(parseFloat(raw) * 100) : undefined;
    const res = await fetch("/api/admin/subscriptions/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chargeId: row.chargeId, amount }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Could not refund");
    toast.success("Refund issued");
    window.location.reload();
  }

  const columns: DataTableColumn<SubscriptionRow>[] = [
    { key: "org", header: "Organization", cell: (r) => r.orgName },
    { key: "plan", header: "Plan", cell: (r) => r.planName },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>
          {r.status}
          {r.cancelAtPeriodEnd ? " (ending)" : ""}
        </Badge>
      ),
    },
    {
      key: "period",
      header: "Renews",
      cell: (r) =>
        r.currentPeriodEnd
          ? new Date(r.currentPeriodEnd).toLocaleDateString()
          : "—",
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (r) => (
        <div className="flex justify-end gap-1">
          <ConfirmDialog
            destructive
            title="Cancel subscription"
            description={`Cancel ${r.orgName}'s "${r.planName}" subscription? This ends their access.`}
            confirmLabel="Cancel subscription"
            cancelLabel="Keep it"
            onConfirm={() => cancel(r)}
            trigger={
              <Button
                variant="ghost"
                size="sm"
                disabled={r.status === "canceled"}
              >
                Cancel
              </Button>
            }
          />
          {r.chargeId ? (
            <ConfirmDialog
              destructive
              title="Refund charge"
              description="Amount is pre-filled to the full charge; edit it for a partial refund."
              confirmLabel="Issue refund"
              onConfirm={() => refund(r)}
              trigger={
                <Button variant="ghost" size="sm">
                  Refund
                </Button>
              }
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor={`refund-${r.id}`}>Amount ($)</Label>
                <Input
                  id={`refund-${r.id}`}
                  type="number"
                  min={0}
                  step="0.01"
                  value={amountFor(r)}
                  onChange={(e) =>
                    setAmounts((prev) => ({ ...prev, [r.id]: e.target.value }))
                  }
                />
              </div>
            </ConfirmDialog>
          ) : (
            <span className="text-muted-foreground px-2 text-sm">—</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      rows={rows}
      getRowKey={(r) => r.id}
      columns={columns}
      empty={<EmptyState title="No subscriptions yet." />}
    />
  );
}
