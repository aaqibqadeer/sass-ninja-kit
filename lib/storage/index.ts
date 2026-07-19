/**
 * lib/storage/index.ts — selects the storage provider from `STORAGE_PROVIDER`
 * (mirrors lib/db/index.ts). App code does `import { storage } from
 * "@/lib/storage"` and never touches an SDK. Construction is lazy and guarded by
 * the `storage` flag — the adapter is only reached from flag-gated routes.
 */

import { features } from "@/config/features";

import type { StorageAdapter } from "./adapter";
import { S3StorageAdapter } from "./s3/adapter";

function createAdapter(): StorageAdapter {
  if (!features.storage) {
    throw new Error(
      "storage adapter used while storage is disabled — set NEXT_PUBLIC_FEATURE_STORAGE",
    );
  }
  // S3 (and S3-compatible endpoints) is the only implementation shipped in the
  // template. A fork adding another provider switches on `env.STORAGE_PROVIDER`
  // here, the same way lib/db/index.ts branches on DB_PROVIDER.
  return new S3StorageAdapter();
}

let instance: StorageAdapter | null = null;
function getInstance(): StorageAdapter {
  return (instance ??= createAdapter());
}

export const storage: StorageAdapter = new Proxy({} as StorageAdapter, {
  get(_target, prop) {
    const target = getInstance() as unknown as Record<PropertyKey, unknown>;
    const value = target[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(target)
      : value;
  },
});

export type { StorageAdapter } from "./adapter";
