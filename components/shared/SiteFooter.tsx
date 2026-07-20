import Link from "next/link";

import { BrandMark } from "@/components/shared/BrandMark";

/**
 * Public site footer for marketing/legal pages. Copy is intentionally minimal —
 * a fork fills in real links. The year is computed at render (server component).
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-border border-t">
      <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm sm:flex-row">
        <div className="flex items-center gap-2">
          <BrandMark />
          <span className="text-foreground font-medium">ninjakit</span>
          <span>— SaaS boilerplate template</span>
        </div>
        <nav className="flex items-center gap-6">
          <Link
            href="/login"
            className="hover:text-foreground transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="hover:text-foreground transition-colors"
          >
            Get started
          </Link>
        </nav>
        <span>© {year}</span>
      </div>
    </footer>
  );
}
