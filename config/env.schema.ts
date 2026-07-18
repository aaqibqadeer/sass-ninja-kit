/**
 * config/env.schema.ts — CORE (CLAUDE.md §2, §4).
 *
 * The single validated gateway to environment variables. Application code never
 * reads `process.env.X` directly — it imports `env` from here. The schema grows
 * per phase: each feature adds its vars, made conditional on the feature flag
 * that turns it on.
 *
 * Phase 0.5 ships only the `TEST_MODE` switch plus the test-environment
 * guardrail scaffold (§12). Database/provider vars arrive in later phases.
 */

import { z } from "zod";

/** Coerce common truthy strings ("1", "true", "yes") to a boolean. */
const booleanFromString = z
  .string()
  .optional()
  .transform(
    (v) =>
      v === "1" || v?.toLowerCase() === "true" || v?.toLowerCase() === "yes",
  );

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  // When true, the app is running against the isolated test database (§12) and
  // the guardrail below is enforced at boot.
  TEST_MODE: booleanFromString,
  // Deferred to later phases: DATABASE_URL, DB_PROVIDER, auth/storage/email/
  // phone/ai provider vars — each added with the feature it belongs to and
  // validated conditionally on its feature flag.
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);

/**
 * Test-environment guardrail (CLAUDE.md §12).
 *
 * When TEST_MODE is on, refuse to boot unless the configured database clearly
 * points at an allow-listed *test* instance. This is a deliberate speed bump
 * against accidentally running destructive/seed operations against production.
 *
 * TODO(Phase 2): once the DB adapter exists, inspect the resolved connection
 * string / project ref and throw if it doesn't match the per-provider test
 * pattern (e.g. Supabase project-ref prefix, or a `-test` suffix on the Mongo
 * cluster name). For now this is a passing placeholder — there is no DB config
 * to validate yet.
 */
export function assertTestEnvironmentSafety(): void {
  if (!env.TEST_MODE) return;
  // TODO(Phase 2): validate DB connection target against allow-listed test
  // patterns and throw a loud, explicit error on mismatch.
}

// Run the guardrail at import time so a misconfigured test run fails fast.
assertTestEnvironmentSafety();
