/**
 * lib/email/send.ts — transactional email sender (Phase 6). Node-only.
 *
 * Wraps the Resend HTTP API directly (no SDK dependency) when `RESEND_API_KEY`
 * is set; otherwise logs the message to the server console so links are usable
 * in local dev without an email provider. This is the single sender used across
 * the app — auth (magic link / password reset) and org invites all call it.
 *
 * A fork that prefers another provider (SES, Postmark, …) swaps the body of this
 * one function; callers and templates don't change.
 */

import { env } from "@/config/env.schema";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  /** Plain-text alternative. Defaults to the subject when omitted. */
  text?: string;
  /** Overrides the default from-address (`AUTH_EMAIL_FROM`). */
  from?: string;
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  const text = message.text ?? message.subject;

  if (!env.RESEND_API_KEY) {
    console.log(`[email → ${message.to}] ${message.subject}\n${text}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: message.from ?? env.AUTH_EMAIL_FROM ?? "onboarding@resend.dev",
      to: message.to,
      subject: message.subject,
      html: message.html,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend send failed (${response.status}): ${body}`);
  }
}
