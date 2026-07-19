"use client";

import type * as React from "react";

import { cn } from "@/lib/utils";

export interface SwitchProps extends Omit<
  React.ComponentProps<"button">,
  "onChange"
> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/**
 * Minimal, dependency-free toggle (role="switch"). Kept SDK-free deliberately —
 * the template avoids adding a Radix dependency just for a toggle.
 */
export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  ...props
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "focus-visible:ring-ring inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "bg-background pointer-events-none inline-block size-4 rounded-full shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
