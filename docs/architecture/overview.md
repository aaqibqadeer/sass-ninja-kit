# Architecture Overview

This is a reusable multi-tenant SaaS boilerplate — infrastructure meant to be
forked for many products. Two ideas keep it reusable.

**Flag-driven features.** Every optional capability (auth methods, payments,
storage, phone verification, AI providers, admin panel) is off unless a flag
turns it on. Flags live in one place, `config/features.ts`, and resolve from
environment variables. App code checks a flag; it never reads `process.env`
directly or assumes a feature exists. Forking a new product is then mostly a
matter of setting env vars — no code surgery.

**Adapter pattern.** Anything with more than one possible provider (database:
Supabase vs MongoDB; storage; email; AI) sits behind a single interface with
one or more concrete implementations. Application code imports the interface
only; the concrete adapter is selected at the edge based on config. Swapping
Supabase for MongoDB means adding an adapter, not touching feature code.

**Multi-tenant by default.** Every tenant-scoped table carries an
`organization_id`. Single-tenant products simply get one silent default org per
user, so the same schema serves both without extra UI.

This file expands as later phases add auth, data, billing, and AI layers.
