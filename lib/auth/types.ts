/**
 * lib/auth/types.ts — provider-agnostic auth types. Pure types only, so this
 * module is safe to import from anywhere (including Edge middleware).
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

export interface Session {
  user: AuthUser;
  /** The organization context resolved for this session (the user's default org). */
  organizationId: string | null;
}

export type OAuthProvider = "google" | "github";

export interface SignUpInput {
  email: string;
  password: string;
  name?: string | null;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

/** A minimal identity result (no session established). Used by seed + signUp. */
export interface CreatedIdentity {
  user: AuthUser;
}
