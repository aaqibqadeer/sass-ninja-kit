"use client";

import { useState, type FormEvent } from "react";

import { features } from "@/config/features";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface PhoneVerifyProps {
  /** Pre-fill the phone field (e.g. from the user's profile). */
  defaultPhone?: string;
  /** Called with the verified phone number once the code is approved. */
  onVerified?: (phone: string) => void;
}

/**
 * Reusable two-step SMS verification (Phase 6). Step 1 sends a code via
 * `/api/phone/start`; step 2 checks it via `/api/phone/check` and calls
 * `onVerified`. Placement-agnostic — usable at signup, in settings, or inside a
 * modal — since it takes only a callback and assumes nothing about its host.
 * Renders nothing when `phoneVerification` is off.
 */
export function PhoneVerify({
  defaultPhone = "",
  onVerified,
}: PhoneVerifyProps) {
  const [phoneNumber, setPhoneNumber] = useState(defaultPhone);
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"enter" | "code">("enter");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!features.phoneVerification) return null;

  async function start(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const res = await fetch("/api/phone/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNumber }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not send the code");
        return;
      }
      setStep("code");
      setNotice(`We sent a code to ${phoneNumber}.`);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function check(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const res = await fetch("/api/phone/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNumber, code }),
      });
      const data = (await res.json()) as { approved?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not verify the code");
        return;
      }
      if (!data.approved) {
        setError("That code is incorrect or expired.");
        return;
      }
      setNotice("Phone number verified.");
      onVerified?.(phoneNumber);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={step === "enter" ? start : check}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="phone-number">Phone number</Label>
        <Input
          id="phone-number"
          type="tel"
          inputMode="tel"
          required
          value={phoneNumber}
          disabled={step === "code"}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+15551234567"
        />
      </div>

      {step === "code" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone-code">Verification code</Label>
          <Input
            id="phone-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={10}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
          />
        </div>
      )}

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-muted-foreground text-sm">
          {notice}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Please wait…" : step === "enter" ? "Send code" : "Verify"}
        </Button>
        {step === "code" && (
          <Button
            type="button"
            variant="ghost"
            disabled={loading}
            onClick={() => {
              setStep("enter");
              setCode("");
              setNotice(null);
              setError(null);
            }}
          >
            Change number
          </Button>
        )}
      </div>
    </form>
  );
}
