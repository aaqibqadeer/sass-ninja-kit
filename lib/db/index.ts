/**
 * lib/db/index.ts — the ONE place that branches on the database provider
 * (CLAUDE.md §1.2). App code does `import { db } from "@/lib/db"` and never
 * touches a concrete adapter or `DB_PROVIDER` directly.
 *
 * The chosen adapter is instantiated once from `env.DB_PROVIDER`. Only the
 * selected provider's connection vars need to be present (validated in
 * config/env.schema.ts). On a fork, the delete-what-you-don't-use rule (§1.5)
 * removes the unused adapter folder and its case here.
 */

import { env } from "@/config/env.schema";

import type { DatabaseAdapter } from "./adapter";
import { MongoAdapter } from "./mongodb/adapter";
import { SupabaseAdapter } from "./supabase/adapter";

function createAdapter(): DatabaseAdapter {
  switch (env.DB_PROVIDER) {
    case "supabase":
      return new SupabaseAdapter();
    case "mongodb":
      return new MongoAdapter();
    default: {
      const exhaustive: never = env.DB_PROVIDER;
      throw new Error(`Unsupported DB_PROVIDER: ${String(exhaustive)}`);
    }
  }
}

/**
 * The adapter is created lazily on first use (not at import) so that merely
 * importing `@/lib/db` — e.g. during a Next build's page-data collection —
 * doesn't require a configured connection. Construction happens the first time a
 * method is called.
 */
let instance: DatabaseAdapter | null = null;
function getInstance(): DatabaseAdapter {
  return (instance ??= createAdapter());
}

export const db: DatabaseAdapter = new Proxy({} as DatabaseAdapter, {
  get(_target, prop) {
    const target = getInstance() as unknown as Record<PropertyKey, unknown>;
    const value = target[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(target)
      : value;
  },
});

export type { DatabaseAdapter } from "./adapter";
export * from "./schema";
