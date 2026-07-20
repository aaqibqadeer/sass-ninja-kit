"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * App toast host (Phase 7). Mounted once in the root layout. Components fire
 * toasts with `import { toast } from "sonner"`. Theme follows the OS/`data-theme`
 * class strategy the template already uses for dark mode.
 */
export function Toaster(props: ToasterProps) {
  return <Sonner position="bottom-right" richColors closeButton {...props} />;
}
