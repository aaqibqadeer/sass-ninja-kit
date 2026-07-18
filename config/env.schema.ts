/**
 * config/env.schema.ts — CORE (CLAUDE.md §2, §4).
 *
 * The single validated gateway to environment variables. Application code never
 * reads `process.env.X` directly — it imports `env` from here.
 *
 * Validation is CONDITIONAL on feature flags: a provider's secret is only
 * required when the flag that uses it is on. Enabling `payments` requires
 * `STRIPE_SECRET_KEY`; leaving it off requires nothing. On a missing required
 * var the app throws at boot with a message listing exactly which vars are
 * missing and why.
 */

import { z } from "zod";
import { features, isAnyAuthEnabled } from "./features";

/** Coerce common truthy strings ("1", "true", "yes") to a boolean. */
const booleanFromString = z
  .string()
  .optional()
  .transform(
    (v) =>
      v === "1" || v?.toLowerCase() === "true" || v?.toLowerCase() === "yes",
  );

const optionalString = z.string().min(1).optional();

/**
 * All env vars the app may read. Everything provider-specific is optional here;
 * whether it is *required* is decided by the flag-aware refinement below, so we
 * can produce a precise "missing X because flag Y is on" error.
 */
const baseSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  TEST_MODE: booleanFromString,

  // Auth
  AUTH_SECRET: optionalString,
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  GITHUB_CLIENT_ID: optionalString,
  GITHUB_CLIENT_SECRET: optionalString,

  // Email (used by magic-link delivery)
  RESEND_API_KEY: optionalString,

  // Payments
  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: optionalString,

  // Storage
  STORAGE_PROVIDER: optionalString,

  // Phone verification (Twilio Verify)
  TWILIO_ACCOUNT_SID: optionalString,
  TWILIO_AUTH_TOKEN: optionalString,
  TWILIO_VERIFY_SERVICE_SID: optionalString,

  // AI providers
  ANTHROPIC_API_KEY: optionalString,
  OPENAI_API_KEY: optionalString,
});

type BaseEnv = z.infer<typeof baseSchema>;

/**
 * One required-when-on rule. `when` is the flag condition; `key` is the env var
 * that must then be present; `reason` explains it in the error message.
 */
interface RequirementRule {
  when: boolean;
  key: keyof BaseEnv;
  reason: string;
}

function requirementRules(): RequirementRule[] {
  return [
    // Auth
    {
      when: isAnyAuthEnabled,
      key: "AUTH_SECRET",
      reason: "an auth method is enabled",
    },
    {
      when: features.auth.oauth.google,
      key: "GOOGLE_CLIENT_ID",
      reason: "auth.oauth.google is on",
    },
    {
      when: features.auth.oauth.google,
      key: "GOOGLE_CLIENT_SECRET",
      reason: "auth.oauth.google is on",
    },
    {
      when: features.auth.oauth.github,
      key: "GITHUB_CLIENT_ID",
      reason: "auth.oauth.github is on",
    },
    {
      when: features.auth.oauth.github,
      key: "GITHUB_CLIENT_SECRET",
      reason: "auth.oauth.github is on",
    },
    {
      when: features.auth.magicLink,
      key: "RESEND_API_KEY",
      reason: "auth.magicLink is on (email delivery)",
    },

    // Payments
    {
      when: features.payments,
      key: "STRIPE_SECRET_KEY",
      reason: "payments is on",
    },
    {
      when: features.payments,
      key: "STRIPE_WEBHOOK_SECRET",
      reason: "payments is on",
    },
    {
      when: features.payments,
      key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      reason: "payments is on",
    },

    // Storage
    {
      when: features.storage,
      key: "STORAGE_PROVIDER",
      reason: "storage is on",
    },

    // Phone verification
    {
      when: features.phoneVerification,
      key: "TWILIO_ACCOUNT_SID",
      reason: "phoneVerification is on",
    },
    {
      when: features.phoneVerification,
      key: "TWILIO_AUTH_TOKEN",
      reason: "phoneVerification is on",
    },
    {
      when: features.phoneVerification,
      key: "TWILIO_VERIFY_SERVICE_SID",
      reason: "phoneVerification is on",
    },

    // AI providers
    {
      when: features.aiProviders.includes("anthropic"),
      key: "ANTHROPIC_API_KEY",
      reason: "aiProviders includes 'anthropic'",
    },
    {
      when: features.aiProviders.includes("openai"),
      key: "OPENAI_API_KEY",
      reason: "aiProviders includes 'openai'",
    },
  ];
}

const envSchema = baseSchema.superRefine((value, ctx) => {
  for (const rule of requirementRules()) {
    if (rule.when && !value[rule.key]) {
      ctx.addIssue({
        code: "custom",
        path: [rule.key],
        message: `${rule.key} is required because ${rule.reason}`,
      });
    }
  }
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration — fix the following and restart:\n${details}\n\n` +
        `See .env.example for every variable and which feature flag requires it.`,
    );
  }
  return result.data;
}

export const env: Env = parseEnv();

/**
 * Test-environment guardrail (CLAUDE.md §12).
 *
 * TODO(Phase 2): once the DB adapter exists, inspect the resolved connection
 * string / project ref and throw if it doesn't match the per-provider test
 * pattern (e.g. Supabase project-ref prefix, or a `-test` suffix on the Mongo
 * cluster name). For now this is a passing placeholder — no DB config to check.
 */
export function assertTestEnvironmentSafety(): void {
  if (!env.TEST_MODE) return;
  // TODO(Phase 2): validate DB connection target against allow-listed test
  // patterns and throw a loud, explicit error on mismatch.
}

assertTestEnvironmentSafety();
