"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ResetPasswordFormProps {
  /**
   * When present, the form is in "set a new password" mode (the token comes from
   * the emailed reset link). When absent, it's in "request a reset link" mode.
   */
  token?: string;
}

/**
 * Dual-mode password reset. Without a token: collect an email and request a
 * link. With a token: collect and submit a new password.
 */
export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function requestLink(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        setError("Could not send reset link");
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function confirmReset(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as { error?: string; redirect?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not reset password");
        return;
      }
      window.location.assign(data.redirect ?? "/login");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          {token ? "Set a new password" : "Reset your password"}
        </CardTitle>
        <CardDescription>
          {token
            ? "Choose a new password for your account."
            : "We'll email you a link to reset it."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {done && !token ? (
          <p className="text-muted-foreground text-sm" role="status">
            If an account exists for that email, a reset link is on its way.
          </p>
        ) : token ? (
          <form onSubmit={confirmReset} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving…" : "Update password"}
            </Button>
          </form>
        ) : (
          <form onSubmit={requestLink} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
