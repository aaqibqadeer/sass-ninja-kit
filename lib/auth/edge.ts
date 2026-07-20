/**
 * lib/auth/edge.ts — Edge-safe session check for `middleware.ts`.
 *
 * Must NOT import the Node adapters (mongoose / supabase-js server client) or
 * `@/lib/auth`. It only needs to know whether a request is authenticated:
 *   - mongodb: verify the session JWT cookie with `jose` (no DB).
 *   - supabase: read/refresh the session via `@supabase/ssr` (Edge-safe),
 *     writing refreshed cookies onto the returned response.
 * This is the Edge counterpart of the Node provider selector in ./index.ts.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { env } from "@/config/env.schema";
import { SESSION_COOKIE, TOKEN_PURPOSE } from "./constants";
import { verifyToken } from "./jwt";

export interface EdgeSessionResult {
  isAuthenticated: boolean;
  /** Response to continue with (carries refreshed Supabase cookies). */
  response: NextResponse;
}

export async function getEdgeSession(
  request: NextRequest,
): Promise<EdgeSessionResult> {
  if (env.DB_PROVIDER === "mongodb") {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const claims = token
      ? await verifyToken(token, TOKEN_PURPOSE.session)
      : null;
    return { isAuthenticated: claims !== null, response: NextResponse.next() };
  }

  // supabase — refresh the session and forward cookies onto the response.
  const response = NextResponse.next({ request });
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return { isAuthenticated: false, response };
  }
  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  return { isAuthenticated: data.user !== null, response };
}
