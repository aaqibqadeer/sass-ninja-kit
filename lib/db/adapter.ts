// Database adapter interface — CORE (CLAUDE.md §2), the one interface all app
// code imports. Concrete implementations live in ./supabase and ./mongodb; the
// provider is chosen once at init and selected inside ./index.ts (the only file
// allowed to branch on provider). The `DatabaseAdapter` interface and its
// methods are defined in Phase 2 alongside the organizations schema.
//
// Deferred to Phase 2: interface definition, Zod-typed models, adapter methods.
export {};
