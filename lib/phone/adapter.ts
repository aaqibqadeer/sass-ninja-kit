/**
 * lib/phone/adapter.ts — the PhoneAdapter interface (Phase 6).
 *
 * Interface+adapter shape (§1.2): app code imports only this interface (via
 * `@/lib/phone`), never a provider SDK. The concrete implementation lives in
 * ./twilio; the provider is selected once in ./index.ts. The provider owns code
 * generation, delivery, and expiry — we only start a verification and check a code.
 */

export interface StartVerificationResult {
  /** Provider status, e.g. "pending". */
  status: string;
}

export interface CheckVerificationResult {
  approved: boolean;
  /** Provider status, e.g. "approved" | "pending" | "canceled". */
  status: string;
}

export interface PhoneAdapter {
  /** Send a verification code to an E.164 phone number. */
  startVerification(phone: string): Promise<StartVerificationResult>;
  /** Check a user-entered code against the pending verification. */
  checkVerification(
    phone: string,
    code: string,
  ): Promise<CheckVerificationResult>;
}
