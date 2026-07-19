"use client";

import { Button } from "@/components/ui/button";

/** Signs the user out (clears the session) and redirects to login. */
export function LogoutButton() {
  async function onClick() {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as { redirect?: string };
    window.location.assign(data.redirect ?? "/login");
  }

  return (
    <Button variant="outline" onClick={onClick}>
      Sign out
    </Button>
  );
}
