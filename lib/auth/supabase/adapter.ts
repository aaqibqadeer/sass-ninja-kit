/**
 * lib/auth/supabase/adapter.ts — auth for the Supabase provider, backed by
 * Supabase Auth. Sessions live in Supabase's cookies via `@supabase/ssr`; a
 * matching profile row is kept in the domain `users` table (id == auth uid).
 *
 * Node-only (next/headers). Reset/magic-link tokens are the PKCE `code` from
 * Supabase's own emailed callback link (exchanged for a session here). Admin
 * operations (seed) use a service-role client that doesn't touch cookies.
 */

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { User as SupabaseUser } from "@supabase/supabase-js";

import { env } from "@/config/env.schema";
import { db } from "@/lib/db";

import type { AuthAdapter } from "../adapter";
import { ensureDefaultOrganization, resolveActiveOrgContext } from "../org";
import type {
  AuthUser,
  CreatedIdentity,
  OAuthProvider,
  ResetPasswordInput,
  Session,
  SignInInput,
  SignUpInput,
} from "../types";

function requireSupabaseEnv(): { url: string; anonKey: string } {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error("Supabase auth: SUPABASE_URL / SUPABASE_ANON_KEY missing");
  }
  return { url: env.SUPABASE_URL, anonKey: env.SUPABASE_ANON_KEY };
}

/** Cookie-bound server client — reads/writes the Supabase session cookies. */
async function ssrClient(): Promise<SupabaseClient> {
  const { url, anonKey } = requireSupabaseEnv();
  const store = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
        } catch {
          // Called from a Server Component (read-only cookies) — safe to ignore;
          // middleware refreshes the session cookie instead.
        }
      },
    },
  });
}

/** Service-role client — bypasses RLS/cookies. Server-only (seed/admin). */
function adminClient(): SupabaseClient {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase auth: service-role env missing");
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function nameOf(user: SupabaseUser): string | null {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const value = meta?.name ?? meta?.full_name;
  return typeof value === "string" ? value : null;
}

export class SupabaseAuthAdapter implements AuthAdapter {
  /** Ensure a domain profile row + default org exist for a Supabase auth user. */
  private async syncDomainUser(su: SupabaseUser): Promise<AuthUser> {
    const email = su.email ?? "";
    const name = nameOf(su);
    const existing = await db.getUserById(su.id);
    if (!existing) {
      await db.createUser({ id: su.id, email, name });
    }
    const user: AuthUser = {
      id: su.id,
      email,
      name,
      isSuperAdmin: existing?.isSuperAdmin ?? false,
    };
    await ensureDefaultOrganization(user);
    return user;
  }

  /**
   * Resolve the active org (+ role) and the authoritative super-admin flag from
   * the domain user row, so `Session` always carries current role/super-admin.
   */
  private async buildSession(user: AuthUser): Promise<Session> {
    const { organizationId, role } = await resolveActiveOrgContext(user.id);
    const domain = await db.getUserById(user.id);
    return {
      user: {
        ...user,
        isSuperAdmin: domain?.isSuperAdmin ?? user.isSuperAdmin,
      },
      organizationId,
      role,
    };
  }

  async getSession(): Promise<Session | null> {
    const supabase = await ssrClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const user: AuthUser = {
      id: data.user.id,
      email: data.user.email ?? "",
      name: nameOf(data.user),
      isSuperAdmin: false,
    };
    return this.buildSession(user);
  }

  async createCredentials(input: SignUpInput): Promise<CreatedIdentity> {
    const admin = adminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { name: input.name ?? null },
    });
    if (error || !data.user) {
      throw new Error(`supabase createUser: ${error?.message ?? "no user"}`);
    }
    await db.createUser({
      id: data.user.id,
      email: input.email,
      name: input.name ?? null,
    });
    return {
      user: {
        id: data.user.id,
        email: input.email,
        name: input.name ?? null,
        isSuperAdmin: false,
      },
    };
  }

  async signUp(input: SignUpInput): Promise<Session> {
    const supabase = await ssrClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { name: input.name ?? null } },
    });
    if (error || !data.user) {
      throw new Error(`supabase signUp: ${error?.message ?? "no user"}`);
    }
    const user = await this.syncDomainUser(data.user);
    return this.buildSession(user);
  }

  async signIn(input: SignInInput): Promise<Session> {
    const supabase = await ssrClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error || !data.user) throw new Error("Invalid email or password");
    const user = await this.syncDomainUser(data.user);
    return this.buildSession(user);
  }

  async signOut(): Promise<void> {
    const supabase = await ssrClient();
    await supabase.auth.signOut();
  }

  async requestPasswordReset(email: string): Promise<void> {
    const supabase = await ssrClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/reset-password`,
    });
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const supabase = await ssrClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
      input.token,
    );
    if (exchangeError) throw new Error("Invalid or expired reset link");
    const { error } = await supabase.auth.updateUser({
      password: input.password,
    });
    if (error) throw new Error(`supabase resetPassword: ${error.message}`);
  }

  async sendMagicLink(email: string): Promise<void> {
    const supabase = await ssrClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/api/auth/magic-link/verify`,
      },
    });
    if (error) throw new Error(`supabase sendMagicLink: ${error.message}`);
  }

  async verifyMagicLink(token: string): Promise<Session> {
    const supabase = await ssrClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(token);
    if (error || !data.user) throw new Error("Invalid or expired magic link");
    const user = await this.syncDomainUser(data.user);
    return this.buildSession(user);
  }

  async getOAuthUrl(
    provider: OAuthProvider,
    redirectTo?: string,
  ): Promise<string> {
    const supabase = await ssrClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback/${provider}${
          redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : ""
        }`,
      },
    });
    if (error || !data.url) {
      throw new Error(`supabase getOAuthUrl: ${error?.message ?? "no url"}`);
    }
    return data.url;
  }

  async completeOAuth(
    _provider: OAuthProvider,
    params: { code: string; state?: string },
  ): Promise<Session> {
    const supabase = await ssrClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(
      params.code,
    );
    if (error || !data.user) throw new Error("OAuth sign-in failed");
    const user = await this.syncDomainUser(data.user);
    return this.buildSession(user);
  }

  async ensureDefaultOrganization(user: AuthUser): Promise<string> {
    return ensureDefaultOrganization(user);
  }
}
