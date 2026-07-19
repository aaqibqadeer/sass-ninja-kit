/**
 * app/sitemap.ts — generates /sitemap.xml (Next.js Metadata API, Phase 9).
 *
 * Lists the public, indexable routes only. Absolute URLs are built from
 * `NEXT_PUBLIC_APP_URL` (validated env, never `process.env`). Add new public
 * pages here; keep authenticated/admin routes out (they're disallowed in
 * robots.ts and shouldn't be advertised).
 */

import type { MetadataRoute } from "next";

import { env } from "@/config/env.schema";

/** Public routes safe to advertise to crawlers. */
const PUBLIC_ROUTES = ["/", "/login", "/signup"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const lastModified = new Date();
  return PUBLIC_ROUTES.map((route) => ({
    url: `${base}${route}`,
    lastModified,
  }));
}
