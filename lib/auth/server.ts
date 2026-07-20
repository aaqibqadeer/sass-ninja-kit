/**
 * lib/auth/server.ts — server-side auth helpers for Server Components and route
 * handlers (Node). `requireAuth()` redirects unauthenticated callers to the
 * login page; use it to guard a page/layout. Middleware (`middleware.ts`) does
 * the coarse redirect; this is the fine-grained, org-aware guard.
 */

import { redirect } from "next/navigation";

import { LOGIN_PATH } from "./constants";
import { auth } from "./index";
import type { Session } from "./types";

export async function getSession(): Promise<Session | null> {
  return auth.getSession();
}

export async function requireAuth(): Promise<Session> {
  const session = await auth.getSession();
  if (!session) redirect(LOGIN_PATH);
  return session;
}
