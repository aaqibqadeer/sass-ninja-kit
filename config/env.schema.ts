/**
 * config/env.schema.ts — CORE (CLAUDE.md §2, §4).
 *
 * The single validated gateway to environment variables. Application code never
 * reads `process.env.X` directly — it imports `env` from here.
 *
 * Validation is CONDITIONAL: a provider's secret is only required when the thing
 * that uses it is active. Feature secrets are gated by their flag (enabling
 * `payments` requires `STRIPE_SECRET_KEY`); database secrets are gated by
 * `DB_PROVIDER` (choosing `supabase` requires the Supabase vars, `mongodb`
 * requires `MONGODB_URI`). On a missing required var the app throws at boot with
 * a message listing exactly which vars are missing and why.
 *
 * `DB_PROVIDER` is CORE (§2) and always required — the database is not optional.
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
  /**
   * Regex (case-insensitive) the DB target must match when TEST_MODE is on.
   * Defaults to "test" so an isolated `*-test*` instance passes the guardrail.
   */
  TEST_DB_PATTERN: z.string().min(1).default("test"),

  // App base URL — used to build OAuth redirect URIs and email links.
  NEXT_PUBLIC_APP_URL: z.string().min(1).default("http://localhost:3000"),
  // From-address for transactional auth emails (magic link / reset) sent via
  // Resend in the custom (MongoDB) flow. Optional; defaults to Resend's sandbox.
  AUTH_EMAIL_FROM: optionalString,

  // Database — CORE. DB_PROVIDER is always required; connection vars are
  // required conditionally on which provider is chosen (see rules below).
  DB_PROVIDER: z.enum(["supabase", "mongodb"]),
  SUPABASE_URL: optionalString,
  SUPABASE_ANON_KEY: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  MONGODB_URI: optionalString,

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

function requirementRules(value: BaseEnv): RequirementRule[] {
  return [
    // Database (gated by DB_PROVIDER)
    {
      when: value.DB_PROVIDER === "supabase",
      key: "SUPABASE_URL",
      reason: "DB_PROVIDER is 'supabase'",
    },
    {
      when: value.DB_PROVIDER === "supabase",
      key: "SUPABASE_ANON_KEY",
      reason: "DB_PROVIDER is 'supabase'",
    },
    {
      when: value.DB_PROVIDER === "supabase",
      key: "SUPABASE_SERVICE_ROLE_KEY",
      reason: "DB_PROVIDER is 'supabase' (server-side adapter)",
    },
    {
      when: value.DB_PROVIDER === "mongodb",
      key: "MONGODB_URI",
      reason: "DB_PROVIDER is 'mongodb'",
    },

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
  for (const rule of requirementRules(value)) {
    if (rule.when && !value[rule.key]) {
      ctx.addIssue({
        code: "custom",
        path: [rule.key],
        message: `required — ${rule.reason}`,
      });
    }
  }
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (result.success) return result.data;

  // Escape hatch for builds / type generation / CI without real secrets
  // (the pattern used by t3-env). Never set this at runtime.
  if (process.env.SKIP_ENV_VALIDATION) {
    const partial = baseSchema.partial().safeParse(process.env);
    return {
      ...(partial.success ? partial.data : {}),
      NODE_ENV: (process.env.NODE_ENV as Env["NODE_ENV"]) ?? "development",
      TEST_MODE: false,
      TEST_DB_PATTERN: process.env.TEST_DB_PATTERN ?? "test",
      NEXT_PUBLIC_APP_URL:
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      DB_PROVIDER:
        (process.env.DB_PROVIDER as Env["DB_PROVIDER"]) ?? "supabase",
    } as Env;
  }

  const details = result.error.issues
    .map((issue) => {
      const varName = issue.path.length ? issue.path.join(".") : "(root)";
      return `  - ${varName}: ${issue.message}`;
    })
    .join("\n");
  throw new Error(
    `Invalid environment configuration — fix the following and restart:\n${details}\n\n` +
      `See .env.example for every variable and which feature flag requires it.\n` +
      `(Set SKIP_ENV_VALIDATION=1 to bypass this for builds/CI without secrets.)`,
  );
}

export const env: Env = parseEnv();

/**
 * Test-environment guardrail (CLAUDE.md §12).
 *
 * When TEST_MODE is on, the resolved database target (Supabase URL or Mongo URI)
 * must match `TEST_DB_PATTERN` (default: /test/i). If it doesn't, refuse to
 * start — a deliberate speed bump against pointing a destructive test/seed run
 * at a non-test database. Tune the allow-list per fork via `TEST_DB_PATTERN`
 * (e.g. a Supabase project-ref prefix or a `-test` Mongo cluster suffix).
 */
export function assertTestEnvironmentSafety(): void {
  if (!env.TEST_MODE) return;

  const target =
    (env.DB_PROVIDER === "mongodb" ? env.MONGODB_URI : env.SUPABASE_URL) ?? "";
  const matchesTestPattern = new RegExp(env.TEST_DB_PATTERN, "i").test(target);

  if (!matchesTestPattern) {
    throw new Error(
      `TEST_MODE is on, but the configured ${env.DB_PROVIDER} database target ` +
        `does not match the test allow-list pattern /${env.TEST_DB_PATTERN}/i. ` +
        `Refusing to start to avoid touching a non-test database. Point it at an ` +
        `isolated test instance, or adjust TEST_DB_PATTERN.`,
    );
  }
}

assertTestEnvironmentSafety();
