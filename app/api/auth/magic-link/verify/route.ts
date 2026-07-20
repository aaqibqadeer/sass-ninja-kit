import { NextResponse, type NextRequest } from "next/server";

import { features } from "@/config/features";
import { auth } from "@/lib/auth";
import { DEFAULT_AUTHED_PATH, LOGIN_PATH } from "@/lib/auth/constants";

/**
 * Consumes a magic-link token and establishes a session, then redirects.
 * Accepts `token` (custom flow) or `code` (Supabase PKCE callback).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!features.auth.magicLink) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }
  const token =
    request.nextUrl.searchParams.get("token") ??
    request.nextUrl.searchParams.get("code") ??
    "";
  try {
    await auth.verifyMagicLink(token);
    return NextResponse.redirect(new URL(DEFAULT_AUTHED_PATH, request.url));
  } catch {
    const url = new URL(LOGIN_PATH, request.url);
    url.searchParams.set("error", "magic_link");
    return NextResponse.redirect(url);
  }
}
