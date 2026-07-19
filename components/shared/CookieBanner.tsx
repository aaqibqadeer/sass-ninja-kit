"use client";

/**
 * CookieBanner — flag-gated cookie-consent banner (Phase 9).
 *
 * Renders only when `features.cookieBanner` is on AND the visitor hasn't chosen
 * yet. Accept/Reject write the choice to a first-party cookie the banner reads on
 * the next visit; no third-party library. The cookie is intentionally NOT
 * httpOnly so this client component can read it via `document.cookie` to decide
 * whether to render. Wiring analytics/marketing scripts to the stored choice is
 * left to the fork (read `getCookieConsent()` before loading them).
 */

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { features } from "@/config/features";

export const COOKIE_CONSENT_COOKIE = "ninjakit_cookie_consent";
/** 180 days — re-prompt after it expires. */
const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export type CookieConsent = "accepted" | "rejected";

/** Read the stored consent choice (client-only), or null if not yet chosen. */
export function getCookieConsent(): CookieConsent | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_CONSENT_COOKIE}=`));
  const value = match?.split("=")[1];
  return value === "accepted" || value === "rejected" ? value : null;
}

function writeConsent(value: CookieConsent): void {
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie =
    `${COOKIE_CONSENT_COOKIE}=${value}; path=/; max-age=${CONSENT_MAX_AGE_SECONDS}` +
    `; samesite=lax${secure}`;
}

export interface CookieBannerProps {
  /** Optional URL for a "Learn more" link (e.g. a routed cookie/privacy page). */
  policyHref?: string;
}

export function CookieBanner({ policyHref }: CookieBannerProps) {
  // Start hidden so server and first client render match; reveal after mount
  // once we can read the cookie, avoiding a hydration mismatch.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (features.cookieBanner && getCookieConsent() === null) setVisible(true);
  }, []);

  if (!features.cookieBanner || !visible) return null;

  const choose = (value: CookieConsent) => {
    writeConsent(value);
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          We use cookies to keep you signed in and to understand how the app is
          used.{" "}
          {policyHref ? (
            <a href={policyHref} className="underline underline-offset-4">
              Learn more
            </a>
          ) : null}
        </p>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => choose("rejected")}
          >
            Reject
          </Button>
          <Button size="sm" onClick={() => choose("accepted")}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
