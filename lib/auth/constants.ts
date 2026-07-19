/**
 * lib/auth/constants.ts — cookie names, token purposes, and TTLs shared across
 * the auth layer. Edge-safe (no Node-only imports).
 */

/** httpOnly session cookie set by the custom (MongoDB) JWT flow. */
export const SESSION_COOKIE = "ninjakit_session";

/** OAuth CSRF state cookie (custom flow). */
export const OAUTH_STATE_COOKIE = "ninjakit_oauth_state";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const RESET_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour
export const MAGIC_LINK_TTL_SECONDS = 60 * 15; // 15 minutes

/** Signed-token purposes so a token minted for one flow can't be used in another. */
export const TOKEN_PURPOSE = {
  session: "session",
  passwordReset: "password_reset",
  magicLink: "magic_link",
} as const;
export type TokenPurpose = (typeof TOKEN_PURPOSE)[keyof typeof TOKEN_PURPOSE];

/** Default post-login destination and the login route middleware redirects to. */
export const LOGIN_PATH = "/login";
export const DEFAULT_AUTHED_PATH = "/dashboard";

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: SESSION_MAX_AGE_SECONDS,
};
