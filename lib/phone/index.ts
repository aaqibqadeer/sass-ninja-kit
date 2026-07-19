/**
 * lib/phone/index.ts — selects the phone-verification provider (Twilio Verify
 * today), mirroring lib/db/index.ts. App code does `import { phone } from
 * "@/lib/phone"`. Construction is lazy and guarded by the `phoneVerification`
 * flag — the adapter is only reached from flag-gated routes.
 */

import { features } from "@/config/features";

import type { PhoneAdapter } from "./adapter";
import { TwilioPhoneAdapter } from "./twilio/adapter";

function createAdapter(): PhoneAdapter {
  if (!features.phoneVerification) {
    throw new Error(
      "phone adapter used while phoneVerification is disabled — set NEXT_PUBLIC_FEATURE_PHONE_VERIFICATION",
    );
  }
  // Twilio Verify is the only implementation shipped. A fork adding another
  // provider switches here (mirrors lib/db/index.ts).
  return new TwilioPhoneAdapter();
}

let instance: PhoneAdapter | null = null;
function getInstance(): PhoneAdapter {
  return (instance ??= createAdapter());
}

export const phone: PhoneAdapter = new Proxy({} as PhoneAdapter, {
  get(_target, prop) {
    const target = getInstance() as unknown as Record<PropertyKey, unknown>;
    const value = target[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(target)
      : value;
  },
});

export type { PhoneAdapter } from "./adapter";
