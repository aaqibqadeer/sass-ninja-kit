/**
 * lib/auth/email.ts — minimal transactional email sender for the custom
 * (MongoDB) auth flow's magic-link and password-reset messages. Node-only.
 *
 * Uses the Resend HTTP API directly (no SDK dependency) when RESEND_API_KEY is
 * set; otherwise logs the message to the server console so links are usable in
 * local dev without an email provider. A full email adapter (lib/email) with
 * templates is a later phase — this is deliberately tiny.
 */

import { env } from "@/config/env.schema";

export interface AuthEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendAuthEmail(message: AuthEmail): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.log(
      `[auth email → ${message.to}] ${message.subject}\n${message.text}`,
    );
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.AUTH_EMAIL_FROM ?? "onboarding@resend.dev",
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend send failed (${response.status}): ${body}`);
  }
}
