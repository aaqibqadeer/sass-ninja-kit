import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Short list of core technologies surfaced under the hero as a trust strip. */
const STACK = [
  "Next.js 15",
  "TypeScript",
  "Tailwind v4",
  "shadcn/ui",
  "Zod",
] as const;

/**
 * Landing-page hero: badge, headline, sub-headline, and the primary CTAs. The
 * left "Log in" button is the main entry point into the app.
 */
export function Hero() {
  return (
    <section className="from-muted/60 to-background bg-gradient-to-b">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 py-24 text-center sm:py-32">
        <span className="border-border bg-background text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
          <span
            className="bg-primary size-1.5 rounded-full"
            aria-hidden="true"
          />
          Open, multi-tenant SaaS boilerplate
        </span>

        <h1 className="font-heading max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">
          The SaaS boilerplate you fork once and ship forever.
        </h1>

        <p className="text-muted-foreground max-w-2xl text-lg text-pretty">
          ninjakit is a reusable, flag-driven template. Auth, payments, admin,
          AI, and storage all sit behind clean adapters and feature flags — turn
          on what you need, delete what you don&apos;t, and start building the
          product instead of the plumbing.
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#features">Explore the features</a>
          </Button>
        </div>

        <ul className="text-muted-foreground mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          {STACK.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
