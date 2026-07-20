// scripts/seed-test.ts — resets and reseeds the isolated .env.test database
// (CLAUDE.md §12). Idempotent and safe to run repeatedly. Guarded by the
// TEST_MODE runtime check in config/env.schema.ts so it can never point at a
// non-test database.
//
// Deferred to Phase 2: real reset/reseed once the DB adapter and org schema exist.
export {};
