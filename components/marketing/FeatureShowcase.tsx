import type { ReactNode } from "react";

interface Feature {
  title: string;
  description: string;
  /** Inline SVG `<path>`(s), drawn with `currentColor` on a 24×24 grid. */
  icon: ReactNode;
}

const FEATURES: Feature[] = [
  {
    title: "Multi-tenant by default",
    description:
      "Every tenant-scoped table carries an organization_id. Single-tenant forks get one silent default org — never a schema that skips the org table.",
    icon: (
      <>
        <path d="M3 21h18" />
        <path d="M6 21V7l6-4 6 4v14" />
        <path d="M10 9h4M10 13h4M10 17h4" />
      </>
    ),
  },
  {
    title: "Adapters over conditionals",
    description:
      "Database, storage, email, phone, and AI each sit behind one interface with swappable implementations. App code imports the interface, never a provider.",
    icon: (
      <>
        <path d="M4 7h10M4 12h16M4 17h10" />
        <circle cx="18" cy="7" r="2" />
        <circle cx="18" cy="17" r="2" />
      </>
    ),
  },
  {
    title: "Auth, batteries included",
    description:
      "Email + password, magic links, and OAuth — plus org roles and a separate platform super-admin tier, all gated by flags.",
    icon: (
      <>
        <rect x="4" y="10" width="16" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
  },
  {
    title: "Payments & pricing",
    description:
      "Stripe checkout, a super-admin-managed plans table, trials, cancellations, and refunds — with immutable Prices handled for you.",
    icon: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20M6 15h4" />
      </>
    ),
  },
  {
    title: "Config-driven flags",
    description:
      "Every optional feature resolves from a single typed registry. Off means not rendered and not routable — a graceful fallback, never a broken page.",
    icon: (
      <>
        <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
        <circle cx="4" cy="12" r="2" />
        <circle cx="12" cy="6" r="2" />
        <circle cx="20" cy="14" r="2" />
      </>
    ),
  },
  {
    title: "AI-ready",
    description:
      "Anthropic and OpenAI live behind one AiAdapter with generate and streaming methods. Pick a provider with a flag; the app code doesn't change.",
    icon: (
      <>
        <rect x="5" y="6" width="14" height="12" rx="3" />
        <path d="M9 2v4M15 2v4M9 11h.01M15 11h.01M9 15h6" />
      </>
    ),
  },
  {
    title: "Admin panel",
    description:
      "A tiered /admin surface: org admins manage their workspace, platform super-admins manage pricing and billing across the whole deployment.",
    icon: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20a7 7 0 0 1 14 0" />
        <path d="M19 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" />
      </>
    ),
  },
  {
    title: "Typed & themeable",
    description:
      "TypeScript strict with Zod at every boundary, and one source of truth for design tokens so a whole re-theme is a variable change, not a component hunt.",
    icon: (
      <>
        <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
        <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
      </>
    ),
  },
];

/** Grid of the boilerplate's headline capabilities. */
export function FeatureShowcase() {
  return (
    <section id="features" className="mx-auto w-full max-w-6xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Everything a SaaS needs, already wired up.
        </h2>
        <p className="text-muted-foreground mt-4 text-lg text-pretty">
          Fork the repo, flip the flags for the features you want, and delete
          the adapters you don&apos;t. Here&apos;s what comes in the box.
        </p>
      </div>

      <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <li
            key={feature.title}
            className="border-border bg-card flex flex-col gap-3 rounded-xl border p-6 shadow-sm"
          >
            <span className="bg-secondary text-secondary-foreground inline-flex size-10 items-center justify-center rounded-lg">
              <svg
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {feature.icon}
              </svg>
            </span>
            <h3 className="font-medium">{feature.title}</h3>
            <p className="text-muted-foreground text-sm text-pretty">
              {feature.description}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
