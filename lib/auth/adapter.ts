/**
 * lib/auth/adapter.ts — the AuthAdapter interface. The ONE auth interface app
 * code and route handlers import (via `@/lib/auth`). Concrete implementations
 * live in ./supabase (Supabase Auth) and ./mongodb (custom JWT + bcrypt); the
 * provider is selected once in ./index.ts based on `DB_PROVIDER`.
 *
 * Methods that establish a session read/write the request's cookies internally
 * (via next/headers), so they only work in a request context (route handlers,
 * server actions). `createCredentials` is the exception — it never touches
 * cookies, so it is safe to call from scripts (seed).
 *
 * All methods are present regardless of which auth *methods* are flag-enabled;
 * disabled methods are simply never invoked (routes/UI gate on
 * `config/features.ts`). Implementations may throw if called for a method whose
 * required env is absent.
 */

import type {
  AuthUser,
  CreatedIdentity,
  OAuthProvider,
  ResetPasswordInput,
  Session,
  SignInInput,
  SignUpInput,
} from "./types";

export interface AuthAdapter {
  /** Current session from the request cookies, or null. */
  getSession(): Promise<Session | null>;

  /**
   * Create an auth identity + domain user WITHOUT establishing a session or an
   * org. Primitive shared by `signUp` and by `scripts/seed.ts`.
   */
  createCredentials(input: SignUpInput): Promise<CreatedIdentity>;

  /**
   * Interactive email/password sign-up: create the identity + domain user, a
   * silent default organization with the user as its admin (§1.3), and
   * establish a session.
   */
  signUp(input: SignUpInput): Promise<Session>;

  /** Email/password sign-in; establishes a session. */
  signIn(input: SignInInput): Promise<Session>;

  /** Clear the current session. */
  signOut(): Promise<void>;

  /** Email/password: send a password-reset link (no-op-safe if user unknown). */
  requestPasswordReset(email: string): Promise<void>;
  /** Email/password: consume a reset token and set the new password. */
  resetPassword(input: ResetPasswordInput): Promise<void>;

  /** Magic link: email a one-time sign-in link. */
  sendMagicLink(email: string): Promise<void>;
  /** Magic link: consume the token and establish a session. */
  verifyMagicLink(token: string): Promise<Session>;

  /** OAuth: URL to redirect the browser to for the given provider. */
  getOAuthUrl(provider: OAuthProvider, redirectTo?: string): Promise<string>;
  /** OAuth: complete the callback (exchange code) and establish a session. */
  completeOAuth(
    provider: OAuthProvider,
    params: { code: string; state?: string },
  ): Promise<Session>;

  /** Ensure a default org + admin membership exist for a user; returns org id. */
  ensureDefaultOrganization(user: AuthUser): Promise<string>;
}
