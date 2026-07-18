/**
 * Central feature-flag registry.
 *
 * Every optional capability in this boilerplate (auth methods, payments,
 * storage, phone verification, AI providers, admin panel, ...) is gated by a
 * flag resolved from environment variables here — never hardcoded on in app
 * code. Each phase that introduces an optional feature adds its flag(s) to the
 * `features` object below and documents the backing env var in `.env.example`.
 *
 * Convention (established in later phases):
 *   - Read raw values from `process.env` only inside this file.
 *   - Coerce to booleans via a small helper so "1"/"true"/"yes" all work.
 *   - App code imports `features` (or a typed accessor), never `process.env`.
 *
 * Phase 0 intentionally ships an empty registry — flags are filled in as each
 * phase adds the feature it controls.
 */

export const features = {
  // Deferred to later phases: auth, payments, storage, phoneVerification,
  // aiProviders, adminPanel, ... — each added alongside the feature it gates.
} as const;

export type FeatureFlags = typeof features;
export type FeatureName = keyof FeatureFlags;
