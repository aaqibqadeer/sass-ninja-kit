/**
 * lib/phone/twilio/adapter.ts — Twilio Verify implementation of PhoneAdapter.
 *
 * Uses the Twilio Verify REST API directly over `fetch` with HTTP Basic auth
 * (no SDK dependency — same lightweight approach as the email sender). Twilio
 * owns code generation, SMS delivery, rate limiting, and expiry.
 */

import { env } from "@/config/env.schema";

import type {
  CheckVerificationResult,
  PhoneAdapter,
  StartVerificationResult,
} from "../adapter";

const VERIFY_BASE = "https://verify.twilio.com/v2/Services";

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`TwilioPhoneAdapter: ${name} is not configured`);
  return value;
}

interface TwilioVerificationResponse {
  status?: string;
  message?: string;
}

export class TwilioPhoneAdapter implements PhoneAdapter {
  private readonly serviceSid: string;
  private readonly authHeader: string;

  constructor() {
    const accountSid = required("TWILIO_ACCOUNT_SID", env.TWILIO_ACCOUNT_SID);
    const authToken = required("TWILIO_AUTH_TOKEN", env.TWILIO_AUTH_TOKEN);
    this.serviceSid = required(
      "TWILIO_VERIFY_SERVICE_SID",
      env.TWILIO_VERIFY_SERVICE_SID,
    );
    this.authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
  }

  private async post(
    path: string,
    body: Record<string, string>,
  ): Promise<TwilioVerificationResponse> {
    const response = await fetch(`${VERIFY_BASE}/${this.serviceSid}/${path}`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body).toString(),
    });
    const data = (await response.json()) as TwilioVerificationResponse;
    if (!response.ok) {
      throw new Error(
        `Twilio Verify failed (${response.status}): ${data.message ?? "unknown error"}`,
      );
    }
    return data;
  }

  async startVerification(phone: string): Promise<StartVerificationResult> {
    const data = await this.post("Verifications", {
      To: phone,
      Channel: "sms",
    });
    return { status: data.status ?? "pending" };
  }

  async checkVerification(
    phone: string,
    code: string,
  ): Promise<CheckVerificationResult> {
    const data = await this.post("VerificationCheck", {
      To: phone,
      Code: code,
    });
    return { approved: data.status === "approved", status: data.status ?? "" };
  }
}
