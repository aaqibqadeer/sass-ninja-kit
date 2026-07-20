import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Technologies the template is built on, shown as a labelled strip. */
const STACK = [
  { name: "Next.js 15", detail: "App Router" },
  { name: "TypeScript", detail: "strict mode" },
  { name: "Tailwind v4", detail: "CSS-first tokens" },
  { name: "shadcn/ui", detail: "new-york" },
  { name: "Zod", detail: "boundary validation" },
  { name: "Stripe", detail: "payments adapter" },
] as const;

/**
 * Closing marketing block: the "built on" stack strip (the #stack anchor) plus
 * the final call-to-action band that points visitors at the login page.
 */
export function CtaSection() {
  return (
    <>
      <section id="stack" className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Built on a boring, modern stack.
          </h2>
          <p className="text-muted-foreground mt-4 text-lg text-pretty">
            Intentionally consistent choices, so the tenth fork feels like the
            first.
          </p>
        </div>

        <ul className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {STACK.map((item) => (
            <li
              key={item.name}
              className="border-border rounded-lg border px-4 py-5 text-center"
            >
              <p className="font-medium">{item.name}</p>
              <p className="text-muted-foreground text-sm">{item.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="bg-primary text-primary-foreground flex flex-col items-center gap-6 rounded-2xl px-6 py-16 text-center">
          <h2 className="font-heading max-w-2xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Take a look inside.
          </h2>
          <p className="max-w-xl text-lg opacity-90 text-pretty">
            Log in to explore the dashboard, workspace switching, and the admin
            tools — the same navigation your users will see.
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link href="/login">Log in to explore</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
