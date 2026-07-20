/**
 * lib/auth/jwt.ts — HS256 sign/verify via `jose`. Used by the custom (MongoDB)
 * auth flow for the session cookie and for stateless password-reset / magic-link
 * tokens. `jose` uses Web Crypto, so this module is Edge-safe and can be used
 * from middleware.
 */

import { SignJWT, jwtVerify } from "jose";

import { env } from "@/config/env.schema";
import type { TokenPurpose } from "./constants";

function secretKey(): Uint8Array {
  if (!env.AUTH_SECRET) {
    throw new Error(
      "AUTH_SECRET is not configured (required for the auth flow)",
    );
  }
  return new TextEncoder().encode(env.AUTH_SECRET);
}

export interface TokenClaims {
  /** Subject — user id for session tokens, email for magic-link tokens. */
  sub: string;
  purpose: TokenPurpose;
  email?: string;
}

export async function signToken(
  claims: TokenClaims,
  ttlSeconds: number,
): Promise<string> {
  return new SignJWT({ purpose: claims.purpose, email: claims.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
    .sign(secretKey());
}

export async function verifyToken(
  token: string,
  expectedPurpose: TokenPurpose,
): Promise<TokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (
      payload.purpose !== expectedPurpose ||
      typeof payload.sub !== "string"
    ) {
      return null;
    }
    return {
      sub: payload.sub,
      purpose: payload.purpose as TokenPurpose,
      email: typeof payload.email === "string" ? payload.email : undefined,
    };
  } catch {
    return null;
  }
}
