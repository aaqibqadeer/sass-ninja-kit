/**
 * lib/auth/index.ts — selects the auth adapter from `DB_PROVIDER` (Node). App
 * code and route handlers do `import { auth } from "@/lib/auth"`. This module
 * imports the concrete adapters (mongoose / supabase-js), so it is Node-only —
 * middleware uses `@/lib/auth/edge` instead.
 */

import { env } from "@/config/env.schema";

import type { AuthAdapter } from "./adapter";
import { MongoAuthAdapter } from "./mongodb/adapter";
import { SupabaseAuthAdapter } from "./supabase/adapter";

function createAuthAdapter(): AuthAdapter {
  switch (env.DB_PROVIDER) {
    case "supabase":
      return new SupabaseAuthAdapter();
    case "mongodb":
      return new MongoAuthAdapter();
    default: {
      const exhaustive: never = env.DB_PROVIDER;
      throw new Error(`Unsupported DB_PROVIDER: ${String(exhaustive)}`);
    }
  }
}

/** Created lazily on first use (not at import) — see the note in lib/db/index.ts. */
let instance: AuthAdapter | null = null;
function getInstance(): AuthAdapter {
  return (instance ??= createAuthAdapter());
}

export const auth: AuthAdapter = new Proxy({} as AuthAdapter, {
  get(_target, prop) {
    const target = getInstance() as unknown as Record<PropertyKey, unknown>;
    const value = target[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(target)
      : value;
  },
});

export type { AuthAdapter } from "./adapter";
export * from "./types";
